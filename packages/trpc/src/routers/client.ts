import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../trpc';
import { db } from '@booktractor/db/client';
import {
  machineTemplates,
  machineInstances,
  machineBookings,
  businessAccounts,
  userAccounts,
  payments,
  BookingStatus,
  PaymentStatus,
  type NewMachineBooking,
  type NewPayment,
} from '@booktractor/db/schemas';
import { eq, and, or, gte, lte, sql, desc, asc, like, ilike } from 'drizzle-orm';
import {
  findAvailableInstances,
  calculateBookingPrice,
} from 'app/lib/services/availability';
import {
  createBookingWithInstances,
  addBookingMessage,
  type CreateBookingRequest,
} from 'app/lib/services/booking';

// Input schemas
const searchMachinesSchema = z.object({
  query: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  tags: z.array(z.number()).optional(),
  sortBy: z.enum(['price', 'name', 'availability']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const checkAvailabilitySchema = z.object({
  templateId: z.string().uuid(),
  startTime: z.string(),
  endTime: z.string(),
  requestedCount: z.number().int().min(1).default(1),
});

const createBookingSchema = z.object({
  templateId: z.string().uuid(),
  requestedCount: z.number().int().min(1).max(10),
  startTime: z.string(),
  endTime: z.string(),
  label: z.string().optional(),
  clientId: z.string(), // Temporary: pass client ID until we have auth
});

const createPaymentIntentSchema = z.object({
  bookingId: z.string().uuid(),
  clientId: z.string(),
});

export const clientRouter = router({
  /**
   * Machine Discovery
   */
  machines: router({
    /**
     * Get featured machines for homepage
     */
    featured: publicProcedure
      .query(async () => {
        // Get top machines with good availability
        const featured = await db
          .select({
            template: machineTemplates,
            availableCount: sql<number>`
              count(distinct case when ${machineInstances.status} = 'active'
                then ${machineInstances.id} end)
            `,
            totalBookings: sql<number>`
              count(distinct ${machineBookings.id})
            `,
          })
          .from(machineTemplates)
          .leftJoin(machineInstances, eq(machineTemplates.id, machineInstances.templateId))
          .leftJoin(machineBookings, eq(machineTemplates.id, machineBookings.templateId))
          .groupBy(machineTemplates.id)
          .having(sql`count(distinct case when ${machineInstances.status} = 'active'
            then ${machineInstances.id} end) > 0`)
          .orderBy(desc(sql`count(distinct ${machineBookings.id})`))
          .limit(6);

        return featured.map(row => ({
          ...row.template,
          availableCount: Number(row.availableCount),
          popularity: Number(row.totalBookings),
        }));
      }),

    /**
     * Search machines with filters
     */
    search: publicProcedure
      .input(searchMachinesSchema)
      .query(async ({ input }) => {
        // Build search conditions
        const conditions = [];

        if (input.query) {
          conditions.push(
            or(
              ilike(machineTemplates.name, `%${input.query}%`),
              ilike(machineTemplates.description, `%${input.query}%`),
              ilike(machineTemplates.code, `%${input.query}%`)
            )
          );
        }

        if (input.minPrice !== undefined) {
          conditions.push(gte(machineTemplates.pricePerHour, input.minPrice));
        }

        if (input.maxPrice !== undefined) {
          conditions.push(lte(machineTemplates.pricePerHour, input.maxPrice));
        }

        // TODO: Add tag filtering when we have a tag system
        // if (input.tags && input.tags.length > 0) {
        //   conditions.push(sql`${machineTemplates.tags} && ${input.tags}`);
        // }

        // Build order by
        let orderByClause;
        const direction = input.sortOrder === 'asc' ? asc : desc;

        switch (input.sortBy) {
          case 'price':
            orderByClause = direction(machineTemplates.pricePerHour);
            break;
          case 'availability':
            orderByClause = desc(sql`count(distinct case when ${machineInstances.status} = 'active'
              then ${machineInstances.id} end)`);
            break;
          case 'name':
          default:
            orderByClause = direction(machineTemplates.name);
            break;
        }

        const results = await db
          .select({
            template: machineTemplates,
            availableCount: sql<number>`
              count(distinct case when ${machineInstances.status} = 'active'
                then ${machineInstances.id} end)
            `,
            account: businessAccounts,
          })
          .from(machineTemplates)
          .leftJoin(machineInstances, eq(machineTemplates.id, machineInstances.templateId))
          .innerJoin(businessAccounts, eq(machineTemplates.accountId, businessAccounts.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .groupBy(machineTemplates.id, businessAccounts.id)
          .having(sql`count(distinct case when ${machineInstances.status} = 'active'
            then ${machineInstances.id} end) > 0`)
          .orderBy(orderByClause)
          .limit(input.limit)
          .offset(input.offset);

        return results.map(row => ({
          ...row.template,
          availableCount: Number(row.availableCount),
          ownerName: row.account.name,
        }));
      }),

    /**
     * Get detailed machine information
     */
    getDetails: publicProcedure
      .input(z.object({
        id: z.string().uuid(),
      }))
      .query(async ({ input }) => {
        const machine = await db
          .select({
            template: machineTemplates,
            account: businessAccounts,
            totalInstances: sql<number>`count(distinct ${machineInstances.id})`,
            activeInstances: sql<number>`
              count(distinct case when ${machineInstances.status} = 'active'
                then ${machineInstances.id} end)
            `,
          })
          .from(machineTemplates)
          .leftJoin(machineInstances, eq(machineTemplates.id, machineInstances.templateId))
          .innerJoin(businessAccounts, eq(machineTemplates.accountId, businessAccounts.id))
          .where(eq(machineTemplates.id, input.id))
          .groupBy(machineTemplates.id, businessAccounts.id)
          .limit(1);

        if (!machine[0]) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Machine not found',
          });
        }

        // Get recent reviews (placeholder - would be from a reviews table)
        const reviews = [
          { rating: 5, comment: 'Great machine, well maintained!', author: 'John D.' },
          { rating: 4, comment: 'Good value for money', author: 'Sarah M.' },
        ];

        return {
          ...machine[0].template,
          owner: {
            id: machine[0].account.id,
            name: machine[0].account.name,
          },
          availability: {
            total: Number(machine[0].totalInstances),
            active: Number(machine[0].activeInstances),
          },
          reviews,
          averageRating: 4.5,
        };
      }),

    /**
     * Check availability for specific dates
     */
    checkAvailability: publicProcedure
      .input(checkAvailabilitySchema)
      .query(async ({ input }) => {
        // Get template
        const template = await db
          .select()
          .from(machineTemplates)
          .where(eq(machineTemplates.id, input.templateId))
          .limit(1);

        if (!template[0]) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Machine not found',
          });
        }

        // Get instances
        const instances = await db
          .select()
          .from(machineInstances)
          .where(
            and(
              eq(machineInstances.templateId, input.templateId),
              eq(machineInstances.status, 'active')
            )
          );

        // Get existing bookings for the time range
        const startTime = new Date(input.startTime);
        const endTime = new Date(input.endTime);

        const existingBookings = await db
          .select()
          .from(machineBookings)
          .where(
            and(
              eq(machineBookings.templateId, input.templateId),
              or(
                eq(machineBookings.status, BookingStatus.PENDING_RENTER_APPROVAL),
                eq(machineBookings.status, BookingStatus.APPROVED_BY_RENTER)
              ),
              or(
                and(
                  gte(machineBookings.startTime, startTime),
                  lte(machineBookings.startTime, endTime)
                ),
                and(
                  gte(machineBookings.endTime, startTime),
                  lte(machineBookings.endTime, endTime)
                ),
                and(
                  lte(machineBookings.startTime, startTime),
                  gte(machineBookings.endTime, endTime)
                )
              )
            )
          );

        // Find available instances
        const availability = findAvailableInstances(
          instances,
          existingBookings,
          startTime,
          endTime,
          input.requestedCount
        );

        // Calculate price
        const totalPrice = calculateBookingPrice(
          template[0],
          startTime,
          endTime
        ) * input.requestedCount;

        return {
          available: availability.availableCount >= input.requestedCount,
          availableCount: availability.availableCount,
          requestedCount: input.requestedCount,
          totalPrice,
          pricePerHour: template[0].pricePerHour,
          availableInstances: availability.availableInstances
            .filter(i => i.isAvailable)
            .slice(0, input.requestedCount)
            .map(i => i.instanceCode),
        };
      }),
  }),

  /**
   * Booking Management
   */
  bookings: router({
    /**
     * Get user's booking history
     */
    myBookings: publicProcedure
      .input(z.object({
        clientId: z.string(),
        status: z.enum([
          BookingStatus.PENDING_RENTER_APPROVAL,
          BookingStatus.APPROVED_BY_RENTER,
          BookingStatus.REJECTED_BY_RENTER,
          BookingStatus.SENT_BACK_TO_CLIENT,
          BookingStatus.CANCELED_BY_CLIENT,
        ]).optional(),
        includeHistory: z.boolean().default(true),
      }))
      .query(async ({ input }) => {
        // Get or create client account
        const clientAccount = await getOrCreateClientAccount(input.clientId);

        const conditions = [
          eq(machineBookings.clientAccountId, clientAccount.id)
        ];

        if (input.status) {
          conditions.push(eq(machineBookings.status, input.status));
        }

        if (!input.includeHistory) {
          conditions.push(gte(machineBookings.endTime, new Date()));
        }

        const bookings = await db
          .select({
            booking: machineBookings,
            template: machineTemplates,
            instance: machineInstances,
            payment: payments,
          })
          .from(machineBookings)
          .innerJoin(machineTemplates, eq(machineBookings.templateId, machineTemplates.id))
          .innerJoin(machineInstances, eq(machineBookings.machineInstanceId, machineInstances.id))
          .leftJoin(payments, eq(machineBookings.paymentId, payments.id))
          .where(and(...conditions))
          .orderBy(desc(machineBookings.createdAt));

        return bookings.map(row => ({
          ...row.booking,
          machineName: row.template.name,
          machineCode: row.template.code,
          instanceCode: row.instance.instanceCode,
          pricePerHour: row.template.pricePerHour,
          totalPrice: calculateBookingPrice(
            row.template,
            row.booking.startTime,
            row.booking.endTime
          ),
          paymentStatus: row.payment?.status || 'pending',
        }));
      }),

    /**
     * Create a new booking
     */
    create: publicProcedure
      .input(createBookingSchema)
      .mutation(async ({ input }) => {
        // Get or create client account
        const clientAccount = await getOrCreateClientAccount(input.clientId);

        // Get template and instances
        const template = await db
          .select()
          .from(machineTemplates)
          .where(eq(machineTemplates.id, input.templateId))
          .limit(1);

        if (!template[0]) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Machine not found',
          });
        }

        const instances = await db
          .select()
          .from(machineInstances)
          .where(
            and(
              eq(machineInstances.templateId, input.templateId),
              eq(machineInstances.status, 'active')
            )
          );

        // Get existing bookings
        const startTime = new Date(input.startTime);
        const endTime = new Date(input.endTime);

        const existingBookings = await db
          .select()
          .from(machineBookings)
          .where(
            and(
              eq(machineBookings.templateId, input.templateId),
              or(
                eq(machineBookings.status, BookingStatus.PENDING_RENTER_APPROVAL),
                eq(machineBookings.status, BookingStatus.APPROVED_BY_RENTER)
              )
            )
          );

        // Create booking with instance assignment
        const bookingRequest: CreateBookingRequest = {
          templateId: input.templateId,
          requestedCount: input.requestedCount,
          clientAccountId: clientAccount.id,
          clientUserId: input.clientId,
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

        // Insert bookings
        const insertedBookings = await db
          .insert(machineBookings)
          .values(result.bookings)
          .returning();

        return {
          bookings: insertedBookings,
          assignedInstances: result.assignedInstances,
          totalPrice: result.totalPrice,
          message: `Successfully booked ${result.assignedInstances.length} unit(s)`,
        };
      }),

    /**
     * Get booking details
     */
    getById: publicProcedure
      .input(z.object({
        id: z.string().uuid(),
        clientId: z.string(),
      }))
      .query(async ({ input }) => {
        const booking = await db
          .select({
            booking: machineBookings,
            template: machineTemplates,
            instance: machineInstances,
            payment: payments,
            owner: businessAccounts,
          })
          .from(machineBookings)
          .innerJoin(machineTemplates, eq(machineBookings.templateId, machineTemplates.id))
          .innerJoin(machineInstances, eq(machineBookings.machineInstanceId, machineInstances.id))
          .innerJoin(businessAccounts, eq(machineTemplates.accountId, businessAccounts.id))
          .leftJoin(payments, eq(machineBookings.paymentId, payments.id))
          .where(eq(machineBookings.id, input.id))
          .limit(1);

        if (!booking[0]) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Booking not found',
          });
        }

        // Verify ownership (temporary check)
        if (booking[0].booking.clientUserId !== input.clientId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to view this booking',
          });
        }

        const totalPrice = calculateBookingPrice(
          booking[0].template,
          booking[0].booking.startTime,
          booking[0].booking.endTime
        );

        return {
          ...booking[0].booking,
          machine: {
            id: booking[0].template.id,
            name: booking[0].template.name,
            code: booking[0].template.code,
            pricePerHour: booking[0].template.pricePerHour,
          },
          instanceCode: booking[0].instance.instanceCode,
          owner: {
            id: booking[0].owner.id,
            name: booking[0].owner.name,
          },
          totalPrice,
          paymentStatus: booking[0].payment?.status || 'pending',
        };
      }),

    /**
     * Send a message in booking thread
     */
    sendMessage: publicProcedure
      .input(z.object({
        bookingId: z.string().uuid(),
        content: z.string().min(1).max(1000),
        clientId: z.string(),
      }))
      .mutation(async ({ input }) => {
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

        // Verify ownership
        if (booking[0].clientUserId !== input.clientId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to send messages in this booking',
          });
        }

        const updatedMessages = addBookingMessage(
          booking[0],
          input.clientId,
          input.content
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
     */
    cancel: publicProcedure
      .input(z.object({
        bookingId: z.string().uuid(),
        reason: z.string().optional(),
        clientId: z.string(),
      }))
      .mutation(async ({ input }) => {
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

        // Verify ownership
        if (booking[0].clientUserId !== input.clientId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to cancel this booking',
          });
        }

        // Check if booking can be cancelled
        if (booking[0].status === BookingStatus.CANCELED_BY_CLIENT ||
            booking[0].status === BookingStatus.REJECTED_BY_RENTER) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Booking is already cancelled or rejected',
          });
        }

        const updateData: any = {
          status: BookingStatus.CANCELED_BY_CLIENT,
        };

        if (input.reason) {
          const updatedMessages = addBookingMessage(
            booking[0],
            input.clientId,
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
  }),

  /**
   * Payment Management
   */
  payments: router({
    /**
     * Create a payment intent for Stripe
     */
    createIntent: publicProcedure
      .input(createPaymentIntentSchema)
      .mutation(async ({ input }) => {
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

        // Verify ownership
        if (booking[0].booking.clientUserId !== input.clientId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to pay for this booking',
          });
        }

        // Check if booking is approved
        if (booking[0].booking.status !== BookingStatus.APPROVED_BY_RENTER) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Booking must be approved before payment',
          });
        }

        // Calculate amount
        const amountCents = calculateBookingPrice(
          booking[0].template,
          booking[0].booking.startTime,
          booking[0].booking.endTime
        );

        // In a real app, we would create a Stripe PaymentIntent here
        // For now, we'll create a placeholder payment record
        const [payment] = await db
          .insert(payments)
          .values({
            bookingId: input.bookingId,
            provider: 'stripe',
            externalId: `pi_${Date.now()}`, // Mock payment intent ID
            amountCents,
            currency: 'USD',
            status: PaymentStatus.PENDING,
          })
          .returning();

        // Update booking with payment ID
        await db
          .update(machineBookings)
          .set({ paymentId: payment.id })
          .where(eq(machineBookings.id, input.bookingId));

        return {
          paymentIntentId: payment.externalId,
          clientSecret: `${payment.externalId}_secret_${Date.now()}`, // Mock client secret
          amount: amountCents,
          currency: 'USD',
        };
      }),

    /**
     * Confirm payment completion
     */
    confirmPayment: publicProcedure
      .input(z.object({
        paymentIntentId: z.string(),
        clientId: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Find payment by external ID
        const payment = await db
          .select()
          .from(payments)
          .where(eq(payments.externalId, input.paymentIntentId))
          .limit(1);

        if (!payment[0]) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Payment not found',
          });
        }

        // In a real app, we would verify with Stripe that payment succeeded
        // For now, we'll just mark it as completed
        const [updated] = await db
          .update(payments)
          .set({ status: PaymentStatus.COMPLETED })
          .where(eq(payments.id, payment[0].id))
          .returning();

        return {
          success: true,
          payment: updated,
        };
      }),
  }),
});

// Helper function to get or create client account
async function getOrCreateClientAccount(userId: string) {
  // Check if user has a client account
  const existingAccount = await db
    .select({
      account: businessAccounts,
    })
    .from(userAccounts)
    .innerJoin(businessAccounts, eq(userAccounts.accountId, businessAccounts.id))
    .where(
      and(
        eq(userAccounts.userId, userId),
        eq(businessAccounts.type, 'client')
      )
    )
    .limit(1);

  if (existingAccount[0]) {
    return existingAccount[0].account;
  }

  // Create new client account
  const [newAccount] = await db
    .insert(businessAccounts)
    .values({
      name: `Client ${userId}`,
      type: 'client',
    })
    .returning();

  // Link user to account
  await db
    .insert(userAccounts)
    .values({
      userId,
      accountId: newAccount.id,
      role: 'account_member',
    });

  return newAccount;
}