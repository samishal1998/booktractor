import { TRPCError } from '@trpc/server';
import type {
  MachineTemplate,
  MachineInstance,
  MachineBooking,
  NewMachineBooking,
  BookingStatus,
  BookingMessage
} from '@booktractor/db/schemas';
import { findAvailableInstances } from './availability';

/**
 * Core booking service for instance-based reservation system
 */

export interface CreateBookingRequest {
  templateId: string;
  requestedCount: number;
  clientAccountId: string;
  clientUserId: string;
  startTime: Date;
  endTime: Date;
  label?: string;
}

export interface CreateBookingResult {
  bookings: NewMachineBooking[];
  assignedInstances: string[];
  totalPrice: number;
}

export interface BookingValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Create bookings with instance assignment
 * This is the core function that implements the instance-based booking model
 *
 * @param request - Booking request details
 * @param template - Machine template
 * @param instances - Available instances for the template
 * @param existingBookings - Existing bookings for overlap checking
 * @returns Created booking records and assigned instance IDs
 */
export async function createBookingWithInstances(
  request: CreateBookingRequest,
  template: MachineTemplate,
  instances: MachineInstance[],
  existingBookings: MachineBooking[]
): Promise<CreateBookingResult> {
  // 1. Validate the booking request
  const validation = validateBookingRequest(request);
  if (!validation.valid) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: validation.errors?.join(', ') || 'Invalid booking request',
    });
  }

  // 2. Find available instances
  const availability = findAvailableInstances(
    instances,
    existingBookings,
    request.startTime,
    request.endTime,
    request.requestedCount
  );

  // 3. Check if we have enough instances
  if (availability.availableCount < request.requestedCount) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: `Only ${availability.availableCount} units available, but ${request.requestedCount} requested`,
    });
  }

  // 4. Select the instances to book
  const instancesToBook = availability.availableInstances
    .filter(i => i.isAvailable)
    .slice(0, request.requestedCount);

  // 5. Calculate total price
  const pricePerUnit = calculateBookingPrice(
    template,
    request.startTime,
    request.endTime
  );
  const totalPrice = pricePerUnit * request.requestedCount;

  // 6. Create booking records
  const bookings: NewMachineBooking[] = instancesToBook.map((instance) => ({
    machineInstanceId: instance.instanceId,
    templateId: template.id,
    clientAccountId: request.clientAccountId,
    clientUserId: request.clientUserId,
    label: request.label || `Booking for ${template.name}`,
    startTime: request.startTime,
    endTime: request.endTime,
    status: 'pending_renter_approval' as const,
    messages: [],
    tags: [],
  }));

  return {
    bookings,
    assignedInstances: instancesToBook.map(i => i.instanceCode),
    totalPrice,
  };
}

/**
 * Validate a booking request
 * @param request - Booking request to validate
 * @returns Validation result with any errors
 */
export function validateBookingRequest(
  request: CreateBookingRequest
): BookingValidationResult {
  const errors: string[] = [];

  // Check dates
  if (request.startTime >= request.endTime) {
    errors.push('End time must be after start time');
  }

  if (request.startTime < new Date()) {
    errors.push('Cannot book in the past');
  }

  // Check count
  if (request.requestedCount < 1) {
    errors.push('Must request at least 1 unit');
  }

  if (request.requestedCount > 100) {
    errors.push('Cannot request more than 100 units at once');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate the price for a booking
 * @param template - Machine template with pricing info
 * @param startTime - Booking start time
 * @param endTime - Booking end time
 * @returns Price in cents
 */
function calculateBookingPrice(
  template: MachineTemplate,
  startTime: Date,
  endTime: Date
): number {
  if (!template.pricePerHour) return 0;

  const durationMs = endTime.getTime() - startTime.getTime();
  const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));

  return durationHours * template.pricePerHour;
}

/**
 * Handle booking status transitions
 * Implements the state machine for booking status changes
 *
 * @param currentStatus - Current booking status
 * @param newStatus - Desired new status
 * @param userRole - Role of the user making the change
 * @returns Whether the transition is allowed
 */
export function canTransitionStatus(
  currentStatus: string,
  newStatus: string,
  userRole: 'renter' | 'client'
): boolean {
  const transitions: Record<string, Record<string, string[]>> = {
    renter: {
      pending_renter_approval: ['approved_by_renter', 'rejected_by_renter', 'sent_back_to_client'],
      sent_back_to_client: ['approved_by_renter', 'rejected_by_renter'],
    },
    client: {
      pending_renter_approval: ['canceled_by_client'],
      sent_back_to_client: ['canceled_by_client', 'pending_renter_approval'],
      approved_by_renter: ['canceled_by_client'], // May have cancellation fees
    },
  };

  const allowedTransitions = transitions[userRole]?.[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

/**
 * Add a message to a booking thread
 * @param booking - The booking to add a message to
 * @param senderId - ID of the message sender
 * @param content - Message content
 * @returns Updated messages array
 */
export function addBookingMessage(
  booking: MachineBooking,
  senderId: string,
  content: string
): BookingMessage[] {
  const newMessage: BookingMessage = {
    sender_id: senderId,
    content,
    ts: new Date().toISOString(),
  };

  return [...(booking.messages || []), newMessage];
}

/**
 * Group bookings by template for display
 * Since users see templates, not instances, we group instance bookings
 *
 * @param bookings - List of bookings to group
 * @returns Bookings grouped by template ID
 */
export function groupBookingsByTemplate(
  bookings: MachineBooking[]
): Map<string, MachineBooking[]> {
  const grouped = new Map<string, MachineBooking[]>();

  for (const booking of bookings) {
    const templateId = booking.templateId;
    if (!grouped.has(templateId)) {
      grouped.set(templateId, []);
    }
    grouped.get(templateId)!.push(booking);
  }

  return grouped;
}

/**
 * Check if a booking can be cancelled without penalty
 * @param booking - Booking to check
 * @param cancellationHours - Hours before booking starts that free cancellation is allowed
 * @returns Whether the booking can be cancelled without penalty
 */
export function canCancelWithoutPenalty(
  booking: MachineBooking,
  cancellationHours: number = 24
): boolean {
  const now = new Date();
  const bookingStart = new Date(booking.startTime);
  const hoursUntilStart = (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursUntilStart >= cancellationHours;
}

/**
 * Format booking status for display
 * @param status - Booking status
 * @returns Human-readable status string
 */
export function formatBookingStatus(status: string): string {
  const statusLabels: Record<string, string> = {
    pending_renter_approval: 'Awaiting Approval',
    approved_by_renter: 'Approved',
    rejected_by_renter: 'Rejected',
    sent_back_to_client: 'Changes Requested',
    canceled_by_client: 'Cancelled',
  };

  return statusLabels[status] || status;
}

/**
 * Get booking status color for UI
 * @param status - Booking status
 * @returns Color class or hex code
 */
export function getBookingStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    pending_renter_approval: 'yellow',
    approved_by_renter: 'green',
    rejected_by_renter: 'red',
    sent_back_to_client: 'orange',
    canceled_by_client: 'gray',
  };

  return statusColors[status] || 'gray';
}