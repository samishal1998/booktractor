import { format } from 'date-fns';
import type {
  MachineTemplate,
  MachineInstance,
  MachineBooking,
  AvailabilityJson,
  AvailabilityRange,
} from '@booktractor/db/schemas';

export interface AvailabilityCheck {
  instanceId: string;
  instanceCode: string;
  isAvailable: boolean;
  conflicts?: MachineBooking[];
}

export interface AvailabilityResult {
  templateId: string;
  requestedCount: number;
  availableCount: number;
  availableInstances: AvailabilityCheck[];
  startTime: Date;
  endTime: Date;
}

/**
 * Find available instances for a given time range
 * @param instances - All instances of a template
 * @param bookings - Existing bookings for these instances
 * @param startTime - Requested start time
 * @param endTime - Requested end time
 * @param requestedCount - Number of units needed
 * @returns Available instances that can fulfill the request
 */
export function findAvailableInstances(
  instances: MachineInstance[],
  bookings: MachineBooking[],
  startTime: Date,
  endTime: Date,
  requestedCount: number
): AvailabilityResult {
  const availableInstances: AvailabilityCheck[] = [];

  for (const instance of instances) {
    // Skip non-active instances
    if (instance.status !== 'active') continue;

    // Check if instance is available for the time range
    const isAvailable = checkInstanceAvailability(
      instance,
      bookings.filter(b => b.machineInstanceId === instance.id),
      startTime,
      endTime
    );

    availableInstances.push({
      instanceId: instance.id,
      instanceCode: instance.instanceCode,
      isAvailable: isAvailable.available,
      conflicts: isAvailable.conflicts,
    });
  }

  const availableCount = availableInstances.filter(i => i.isAvailable).length;

  return {
    templateId: instances[0]?.templateId || '',
    requestedCount,
    availableCount,
    availableInstances,
    startTime,
    endTime,
  };
}

/**
 * Check if a single instance is available for a time range
 * @param instance - The machine instance
 * @param bookings - Existing bookings for this instance
 * @param startTime - Requested start time
 * @param endTime - Requested end time
 * @returns Whether the instance is available and any conflicting bookings
 */
export function checkInstanceAvailability(
  instance: MachineInstance,
  bookings: MachineBooking[],
  startTime: Date,
  endTime: Date
): { available: boolean; conflicts?: MachineBooking[] } {
  // First check for booking conflicts
  const conflicts = findBookingOverlaps(bookings, startTime, endTime);
  if (conflicts.length > 0) {
    return { available: false, conflicts };
  }

  // Then check availability schedule (if defined)
  if (instance.availabilityJson) {
    const isInSchedule = checkAvailabilitySchedule(
      instance.availabilityJson,
      startTime,
      endTime
    );
    if (!isInSchedule) {
      return { available: false };
    }
  }

  return { available: true };
}

/**
 * Find all bookings that overlap with a given time range
 * @param bookings - List of bookings to check
 * @param startTime - Start of the range
 * @param endTime - End of the range
 * @returns Bookings that overlap with the time range
 */
export function findBookingOverlaps(
  bookings: MachineBooking[],
  startTime: Date,
  endTime: Date
): MachineBooking[] {
  return bookings.filter(booking => {
    // Skip cancelled bookings
    if (booking.status === 'canceled_by_client' ||
        booking.status === 'rejected_by_renter') {
      return false;
    }

    const bookingStart = new Date(booking.startTime);
    const bookingEnd = new Date(booking.endTime);

    // Check for any overlap
    // Overlap exists if:
    // - Booking starts before request ends AND
    // - Booking ends after request starts
    return bookingStart < endTime && bookingEnd > startTime;
  });
}

/**
 * Check if a time range fits within availability schedule
 * @param availability - JSONB availability definition
 * @param startTime - Start time to check
 * @param endTime - End time to check
 * @returns Whether the time range is within available hours
 */
export function checkAvailabilitySchedule(
  availability: AvailabilityJson,
  startTime: Date,
  endTime: Date
): boolean {
  // Check date-specific overrides first
  if (availability.overrides) {
    const dateKey = format(startTime, 'yyyy-MM-dd');
    if (dateKey in availability.overrides) {
      const override = availability.overrides[dateKey];
      // Empty array means closed
      if (!override || override.length === 0) return false;

      return checkOverrideSlots(override, startTime, endTime);
    }
  }

  if (availability.base) {
    const dayKey = format(startTime, 'EEE').toLowerCase(); // mon, tue, etc.
    const schedule = availability.base[dayKey];

    if (!schedule || schedule.length === 0) return false;

    return checkDailySlots(schedule, startTime, endTime);
  }

  // If no schedule defined, assume always available
  return true;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function checkOverrideSlots(
  slots: AvailabilityRange[],
  startTime: Date,
  endTime: Date
): boolean {
  return slots.some((slot) => {
    const slotStart = toDate(slot.start);
    const slotEnd = toDate(slot.end);
    return slotStart <= startTime && slotEnd >= endTime;
  });
}

function checkDailySlots(
  slots: AvailabilityRange[],
  startTime: Date,
  endTime: Date
): boolean {
  const requestStartMinutes = getUtcMinutes(startTime);
  const requestEndMinutes = getUtcMinutes(endTime);

  return slots.some((slot) => {
    const slotStartMinutes = getUtcMinutes(toDate(slot.start));
    const slotEndMinutes = getUtcMinutes(toDate(slot.end));
    return (
      requestStartMinutes >= slotStartMinutes && requestEndMinutes <= slotEndMinutes
    );
  });
}

function getUtcMinutes(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

/**
 * Merge template and instance availability
 * Instance availability overrides template defaults
 */
export function resolveAvailability(
  template: MachineTemplate,
  instance: MachineInstance
): AvailabilityJson {
  // If instance has no overrides, use template
  if (!instance.availabilityJson) {
    return template.availabilityJson || {};
  }

  // If instance has availability, it completely replaces template
  // (In a more complex system, you might want to merge them)
  return instance.availabilityJson;
}

/**
 * Calculate the price for a booking
 * @param template - Machine template with pricing
 * @param startTime - Booking start
 * @param endTime - Booking end
 * @returns Total price in cents
 */
export function calculateBookingPrice(
  template: MachineTemplate,
  startTime: Date,
  endTime: Date
): number {
  if (!template.pricePerHour) return 0;

  const durationMs = endTime.getTime() - startTime.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  return Math.ceil(durationHours * template.pricePerHour);
}

/**
 * Generate instance codes for a template
 * @param templateCode - Base template code (e.g., "EXC")
 * @param count - Number of instances to generate codes for
 * @returns Array of instance codes (e.g., ["EXC-1", "EXC-2", "EXC-3"])
 */
export function generateInstanceCodes(
  templateCode: string,
  count: number
): string[] {
  const codes: string[] = [];
  for (let i = 1; i <= count; i++) {
    codes.push(`${templateCode}-${i}`);
  }
  return codes;
}