import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../trpc';
import { db } from '@booktractor/db/client';
import {
  machineBookings,
  machineTemplates,
  machineInstances,
  businessAccounts,
  userAccounts,
  BookingStatus,
} from '@booktractor/db/schemas';
import { eq, and, or, gte, lte, sql, SQL } from 'drizzle-orm';
import {
  createBookingWithInstances,
  canTransitionStatus,
  addBookingMessage,
  type CreateBookingRequest,
} from 'app/lib/services/booking';

// Input schemas
const createBookingSchema = z.object({
  templateId: z.string().uuid(),
  requestedCount: z.number().int().min(1).max(10),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  label: z.string().optional(),
});

const updateStatusSchema = z.object({
  bookingId: z.string().uuid(),
  newStatus: z.enum([
    BookingStatus.PENDING_RENTER_APPROVAL,
    BookingStatus.APPROVED_BY_RENTER,
    BookingStatus.REJECTED_BY_RENTER,
    BookingStatus.SENT_BACK_TO_CLIENT,
    BookingStatus.CANCELED_BY_CLIENT,
  ]),
  message: z.string().optional(),
});

const attachmentSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1).max(255),
  contentType: z.string().min(3),
  size: z.number().int().nonnegative().optional(),
});

const sendMessageSchema = z.object({
  bookingId: z.string().uuid(),
  content: z.string().min(1).max(1000),
  attachments: z.array(attachmentSchema).max(5).optional(),
});

export const bookingsRouter = router({
  /**
   * Create a new booking
   * Public - temporarily no auth required
   */
  create: publicProcedure
    .input(createBookingSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Must be logged in',
        });
      }

      // Get user's client account
      const userAccount = await db
        .select({
          accountId: userAccounts.accountId,
          accountType: businessAccounts.type,
        })
        .from(userAccounts)
        .innerJoin(businessAccounts, eq(userAccounts.accountId, businessAccounts.id))
        .where(
          and(
            eq(userAccounts.userId, ctx.user.id),
            eq(businessAccounts.type, 'client')
          )
        )
        .limit(1);

      if (!userAccount[0]) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Must have a client account to create bookings',
        });
      }

      // Get template
      const template = await db
        .select()
        .from(machineTemplates)
        .where(eq(machineTemplates.id, input.templateId))
        .limit(1);

      if (!template[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Machine template not found',
        });
      }

      // Get all instances for this template
      const instances = await db
        .select()
        .from(machineInstances)
        .where(
          and(
            eq(machineInstances.templateId, input.templateId),
            eq(machineInstances.status, 'active')
          )
        );

      if (instances.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No available instances for this template',
        });
      }

      // Get existing bookings for overlap checking
      const startTime = new Date(input.startTime);
      const endTime = new Date(input.endTime);

      const existingBookings = await db
        .select()
        .from(machineBookings)
        .where(
          and(
            eq(machineBookings.templateId, input.templateId),
            // Find overlapping bookings
            or(
              // Booking starts during our range
              and(
                gte(machineBookings.startTime, startTime),
                lte(machineBookings.startTime, endTime)
              ),
              // Booking ends during our range
              and(
                gte(machineBookings.endTime, startTime),
                lte(machineBookings.endTime, endTime)
              ),
              // Booking completely encompasses our range
              and(
                lte(machineBookings.startTime, startTime),
                gte(machineBookings.endTime, endTime)
              )
            )
          )
        );

      // Create booking with instance assignment
      const bookingRequest: CreateBookingRequest = {
        templateId: input.templateId,
        requestedCount: input.requestedCount,
        clientAccountId: userAccount[0].accountId,
        clientUserId: ctx.user.id,
        startTime,
        endTime,
        label: input.label,
      };

      const result = await createBookingWithInstances(
        bookingRequest,
        template[0],
        instances,
        existingBookings
      );

      // Insert the bookings
      const insertedBookings = await db
        .insert(machineBookings)
        .values(result.bookings)
        .returning();

      return {
        bookings: insertedBookings,
        assignedInstances: result.assignedInstances,
        totalPrice: result.totalPrice,
      };
    }),

  /**
   * List bookings
   * Public - temporarily no auth required
   */
  list: publicProcedure
    .input(z.object({
      status: z.enum([
        BookingStatus.PENDING_RENTER_APPROVAL,
        BookingStatus.APPROVED_BY_RENTER,
        BookingStatus.REJECTED_BY_RENTER,
        BookingStatus.SENT_BACK_TO_CLIENT,
        BookingStatus.CANCELED_BY_CLIENT,
      ]).optional(),
      templateId: z.string().uuid().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Must be logged in',
        });
      }

      // Get user's accounts
      const userAccountsList = await db
        .select({
          accountId: userAccounts.accountId,
          accountType: businessAccounts.type,
        })
        .from(userAccounts)
        .innerJoin(businessAccounts, eq(userAccounts.accountId, businessAccounts.id))
        .where(eq(userAccounts.userId, ctx.user.id));

      const clientAccountIds = userAccountsList
        .filter(a => a.accountType === 'client')
        .map(a => a.accountId);

      const renterAccountIds = userAccountsList
        .filter(a => a.accountType === 'renter')
        .map(a => a.accountId);

      // Build query conditions
      const conditions: SQL<unknown>[] = [];

      // User can see bookings they made (as client) or bookings for their machines (as renter)
      if (clientAccountIds.length > 0 || renterAccountIds.length > 0) {
        const orConditions: SQL<unknown>[] = [];

        if (clientAccountIds.length > 0) {
          orConditions.push(
            sql`${machineBookings.clientAccountId} IN ${clientAccountIds}`
          );
        }

        if (renterAccountIds.length > 0) {
          // Get template IDs for renter accounts
          const renterTemplates = await db
            .select({ id: machineTemplates.id })
            .from(machineTemplates)
            .where(sql`${machineTemplates.accountId} IN ${renterAccountIds}`);

          const templateIds = renterTemplates.map(t => t.id);
          if (templateIds.length > 0) {
            orConditions.push(
              sql`${machineBookings.templateId} IN ${templateIds}`
            );
          }
        }

        if (orConditions.length > 0) {
          const orCondition = or(...orConditions);
          if (orCondition) {
            conditions.push(orCondition);
          }
        }
      }

      // Filter by status
      if (input.status) {
        conditions.push(eq(machineBookings.status, input.status));
      }

      // Filter by template
      if (input.templateId) {
        conditions.push(eq(machineBookings.templateId, input.templateId));
      }

      // Filter by date range
      if (input.startDate) {
        conditions.push(gte(machineBookings.startTime, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(machineBookings.endTime, new Date(input.endDate)));
      }

      const bookings = await db
        .select({
          booking: machineBookings,
          instance: machineInstances,
          template: machineTemplates,
        })
        .from(machineBookings)
        .innerJoin(machineInstances, eq(machineBookings.machineInstanceId, machineInstances.id))
        .innerJoin(machineTemplates, eq(machineBookings.templateId, machineTemplates.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(sql`${machineBookings.createdAt} DESC`);

      return bookings.map(row => ({
        ...row.booking,
        instanceCode: row.instance.instanceCode,
        templateName: row.template.name,
        templateCode: row.template.code,
      }));
    }),

  /**
   * Get booking by ID
   * Public - temporarily no auth required
   */
  getById: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Must be logged in',
        });
      }

      const booking = await db
        .select({
          booking: machineBookings,
          instance: machineInstances,
          template: machineTemplates,
        })
        .from(machineBookings)
        .innerJoin(machineInstances, eq(machineBookings.machineInstanceId, machineInstances.id))
        .innerJoin(machineTemplates, eq(machineBookings.templateId, machineTemplates.id))
        .where(eq(machineBookings.id, input.id))
        .limit(1);

      if (!booking[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Booking not found',
        });
      }

      // Check if user has access to this booking
      const userAccountsList = await db
        .select({
          accountId: userAccounts.accountId,
        })
        .from(userAccounts)
        .where(eq(userAccounts.userId, ctx.user.id));

      const userAccountIds = userAccountsList.map(a => a.accountId);

      const isClient = userAccountIds.includes(booking[0].booking.clientAccountId);
      const isRenter = userAccountIds.includes(booking[0].template.accountId);

      if (!isClient && !isRenter) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to view this booking',
        });
      }

      return {
        ...booking[0].booking,
        instanceCode: booking[0].instance.instanceCode,
        templateName: booking[0].template.name,
        templateCode: booking[0].template.code,
        pricePerHour: booking[0].template.pricePerHour,
      };
    }),

  /**
   * Update booking status
   * Public - temporarily no auth required
   */
  updateStatus: publicProcedure
    .input(updateStatusSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Must be logged in',
        });
      }

      // Get booking
      const booking = await db
        .select({
          booking: machineBookings,
          template: machineTemplates,
        })
        .from(machineBookings)
        .innerJoin(machineTemplates, eq(machineBookings.templateId, machineTemplates.id))
        .where(eq(machineBookings.id, input.bookingId))
        .limit(1);

      if (!booking[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Booking not found',
        });
      }

      // Determine user role
      const userAccountsList = await db
        .select({
          accountId: userAccounts.accountId,
        })
        .from(userAccounts)
        .where(eq(userAccounts.userId, ctx.user.id));

      const userAccountIds = userAccountsList.map(a => a.accountId);

      const isClient = userAccountIds.includes(booking[0].booking.clientAccountId);
      const isRenter = userAccountIds.includes(booking[0].template.accountId);

      let userRole: 'client' | 'renter';
      if (isClient) {
        userRole = 'client';
      } else if (isRenter) {
        userRole = 'renter';
      } else {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to update this booking',
        });
      }

      // Check if transition is allowed
      const canTransition = canTransitionStatus(
        booking[0].booking.status,
        input.newStatus,
        userRole
      );

      if (!canTransition) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot transition from ${booking[0].booking.status} to ${input.newStatus} as ${userRole}`,
        });
      }

      // Update status
      const updateData: any = {
        status: input.newStatus,
      };

      // Add message if provided
      if (input.message) {
        const updatedMessages = addBookingMessage(
          booking[0].booking,
          ctx.user.id,
          `Status changed to ${input.newStatus}: ${input.message}`
        );
        updateData.messages = updatedMessages;
      }

      const [updated] = await db
        .update(machineBookings)
        .set(updateData)
        .where(eq(machineBookings.id, input.bookingId))
        .returning();

      return updated;
    }),

  /**
   * Send a message in a booking thread
   * Public - temporarily no auth required
   */
  sendMessage: publicProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Must be logged in',
        });
      }

      // Get booking
      const booking = await db
        .select({
          booking: machineBookings,
          template: machineTemplates,
        })
        .from(machineBookings)
        .innerJoin(machineTemplates, eq(machineBookings.templateId, machineTemplates.id))
        .where(eq(machineBookings.id, input.bookingId))
        .limit(1);

      if (!booking[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Booking not found',
        });
      }

      // Check if user is involved
      const userAccountsList = await db
        .select({
          accountId: userAccounts.accountId,
        })
        .from(userAccounts)
        .where(eq(userAccounts.userId, ctx.user.id));

      const userAccountIds = userAccountsList.map(a => a.accountId);

      const isClient = userAccountIds.includes(booking[0].booking.clientAccountId);
      const isRenter = userAccountIds.includes(booking[0].template.accountId);

      if (!isClient && !isRenter) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to send messages in this booking',
        });
      }

      // Add message
      const updatedMessages = addBookingMessage(
        booking[0].booking,
        ctx.user.id,
        input.content,
        input.attachments
      );

      const [updated] = await db
        .update(machineBookings)
        .set({ messages: updatedMessages })
        .where(eq(machineBookings.id, input.bookingId))
        .returning();

      return updated;
    }),

  /**
   * Cancel a booking
   * Public - temporarily no auth required
   */
  cancel: publicProcedure
    .input(z.object({
      bookingId: z.string().uuid(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Must be logged in',
        });
      }

      // Get booking
      const booking = await db
        .select()
        .from(machineBookings)
        .where(eq(machineBookings.id, input.bookingId))
        .limit(1);

      if (!booking[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Booking not found',
        });
      }

      // Check if user is the client
      const userAccountsList = await db
        .select({
          accountId: userAccounts.accountId,
        })
        .from(userAccounts)
        .where(eq(userAccounts.userId, ctx.user.id));

      const userAccountIds = userAccountsList.map(a => a.accountId);
      const isClient = userAccountIds.includes(booking[0].clientAccountId);

      if (!isClient) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the client can cancel their booking',
        });
      }

      // Check if booking can be cancelled
      const canCancel = canTransitionStatus(
        booking[0].status,
        BookingStatus.CANCELED_BY_CLIENT,
        'client'
      );

      if (!canCancel) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This booking cannot be cancelled in its current status',
        });
      }

      // Update status to cancelled
      const updateData: any = {
        status: BookingStatus.CANCELED_BY_CLIENT,
      };

      if (input.reason) {
        const updatedMessages = addBookingMessage(
          booking[0],
          ctx.user.id,
          `Booking cancelled: ${input.reason}`
        );
        updateData.messages = updatedMessages;
      }

      const [updated] = await db
        .update(machineBookings)
        .set(updateData)
        .where(eq(machineBookings.id, input.bookingId))
        .returning();

      return updated;
    }),
});