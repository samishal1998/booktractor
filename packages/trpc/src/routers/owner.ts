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
  BookingStatus,
  type NewMachineTemplate,
  type NewMachineInstance,
  type AvailabilityJson,
} from '@booktractor/db/schemas';
import { eq, and, or, gte, lte, sql, desc, asc } from 'drizzle-orm';
import { generateInstanceCodes } from 'app/lib/services/availability';
import { addBookingMessage, canTransitionStatus } from 'app/lib/services/booking';

const availabilityInputSchema = z
  .object({
    base: z
      .record(
        z.string(),
        z.array(
          z.object({
            start: z.string(),
            end: z.string(),
          })
        )
      )
      .optional(),
    overrides: z
      .record(
        z.string(),
        z.array(
          z.object({
            start: z.string(),
            end: z.string(),
          })
        )
      )
      .optional(),
  })
  .optional();

// Input schemas
const createMachineSchema = z.object({
  ownerId: z.string(), // Temporary: pass owner ID until we have auth
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  description: z.string().optional(),
  totalCount: z.number().int().min(1).max(100).default(1),
  pricePerHour: z.number().int().min(0),
  specs: z.record(z.string(), z.unknown()).optional(),
  availabilityJson: availabilityInputSchema,
  tags: z.array(z.number()).optional(),
});

const updateMachineSchema = createMachineSchema.partial().extend({
  id: z.string().uuid(),
});

const normalizeAvailabilityInput = (
  input?: z.infer<typeof availabilityInputSchema>
): AvailabilityJson | undefined => {
  if (!input) return undefined;

  const convertSlots = (
    slots: Array<{ start: string; end: string }>
  ): { start: Date; end: Date }[] =>
    slots
      .map((slot) => {
        const start = new Date(slot.start);
        const end = new Date(slot.end);
        if (
          Number.isNaN(start.getTime()) ||
          Number.isNaN(end.getTime()) ||
          start >= end
        ) {
          return null;
        }
        return { start, end };
      })
      .filter(
        (slot): slot is { start: Date; end: Date } =>
          slot !== null
      );

  const base = input.base
    ? Object.fromEntries(
        Object.entries(input.base)
          .map(([key, slots]) => {
            const normalizedSlots = convertSlots(slots);
            if (!normalizedSlots.length) {
              return null;
            }
            return [key, normalizedSlots] as const;
          })
          .filter((entry): entry is [string, { start: Date; end: Date }[]] => !!entry)
      )
    : undefined;

  const overrides = input.overrides
    ? Object.fromEntries(
        Object.entries(input.overrides)
          .map(([key, slots]) => {
            const normalizedSlots = convertSlots(slots);
            if (!normalizedSlots.length) {
              return null;
            }
            return [key, normalizedSlots] as const;
          })
          .filter((entry): entry is [string, { start: Date; end: Date }[]] => !!entry)
      )
    : undefined;

  const result: AvailabilityJson = {};
  if (base && Object.keys(base).length) {
    result.base = base;
  }
  if (overrides && Object.keys(overrides).length) {
    result.overrides = overrides;
  }

  return Object.keys(result).length ? result : {};
};

const listBookingsSchema = z.object({
  ownerId: z.string(), // Temporary: pass owner ID
  machineId: z.string().uuid().optional(),
  status: z.enum([
    BookingStatus.PENDING_RENTER_APPROVAL,
    BookingStatus.APPROVED_BY_RENTER,
    BookingStatus.REJECTED_BY_RENTER,
    BookingStatus.SENT_BACK_TO_CLIENT,
    BookingStatus.CANCELED_BY_CLIENT,
  ]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const updateBookingStatusSchema = z.object({
  bookingId: z.string().uuid(),
  newStatus: z.enum([
    BookingStatus.APPROVED_BY_RENTER,
    BookingStatus.REJECTED_BY_RENTER,
    BookingStatus.SENT_BACK_TO_CLIENT,
  ]),
  message: z.string().optional(),
  ownerId: z.string(), // Temporary
});

export const ownerRouter = router({
  /**
   * Machine Management
   */
  machines: router({
    /**
     * Create a new machine with instances
     */
    create: publicProcedure
      .input(createMachineSchema)
      .mutation(async ({ input }) => {
        // Get or create owner's business account
        let accountId: string;

        // Check if user has a renter account
        const existingAccount = await db
          .select({
            accountId: userAccounts.accountId,
          })
          .from(userAccounts)
          .innerJoin(businessAccounts, eq(userAccounts.accountId, businessAccounts.id))
          .where(
            and(
              eq(userAccounts.userId, input.ownerId),
              eq(businessAccounts.type, 'renter')
            )
          )
          .limit(1);

        if (existingAccount[0]) {
          accountId = existingAccount[0].accountId;
        } else {
          // Create new renter account
          const renterResults = await db
            .insert(businessAccounts)
            .values({
              name: `${input.ownerId}'s Rental Business`,
              type: 'renter',
            })
            .returning();
          const newAccount = renterResults[0];

          if (!newAccount) {
            throw new Error('Failed to create renter business account');
          }

          // Link user to account
          await db
            .insert(userAccounts)
            .values({
              userId: input.ownerId,
              accountId: newAccount.id,
              role: 'account_admin',
            });

          accountId = newAccount.id;
        }

        // Create machine template
        const { ownerId, availabilityJson, ...machineData } = input;
        const normalizedAvailability = normalizeAvailabilityInput(
          availabilityJson
        );
        const newTemplate: NewMachineTemplate = {
          ...machineData,
          accountId,
          ...(normalizedAvailability ? { availabilityJson: normalizedAvailability } : {}),
        };

        const [template] = await db
          .insert(machineTemplates)
          .values(newTemplate)
          .returning();

        // Auto-generate instances
        if (template && input.totalCount > 0) {
          const instanceCodes = generateInstanceCodes(input.code, input.totalCount);
          const instances: NewMachineInstance[] = instanceCodes.map(code => ({
            templateId: template.id,
            instanceCode: code,
            status: 'active',
            availabilityJson: normalizedAvailability ?? template.availabilityJson,
          }));

          await db.insert(machineInstances).values(instances);
        }

        return {
          ...template,
          instancesCreated: input.totalCount,
        };
      }),

    /**
     * Update machine details
     */
    update: publicProcedure
      .input(updateMachineSchema)
      .mutation(async ({ input }) => {
        const { id, ownerId, availabilityJson, ...updateData } = input;

        // Verify ownership (in real app, this would be from auth context)
        const template = await db
          .select()
          .from(machineTemplates)
          .where(eq(machineTemplates.id, id))
          .limit(1);

        if (!template[0]) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Machine not found',
          });
        }

        const normalizedAvailability = normalizeAvailabilityInput(availabilityJson);
        const updatePayload: Partial<typeof machineTemplates.$inferInsert> = {
          ...updateData,
        };

        if (normalizedAvailability !== undefined) {
          updatePayload.availabilityJson = normalizedAvailability;
        }

        const [updated] = await db
          .update(machineTemplates)
          .set(updatePayload)
          .where(eq(machineTemplates.id, id))
          .returning();

        return updated;
      }),

    /**
     * Archive (soft delete) a machine
     */
    archive: publicProcedure
      .input(z.object({
        id: z.string().uuid(),
        ownerId: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Set all instances to retired
        await db
          .update(machineInstances)
          .set({ status: 'retired' })
          .where(eq(machineInstances.templateId, input.id));

        // In a real app, we might add an 'archived' field to templates
        // For now, we'll just mark instances as retired
        return { success: true, message: 'Machine archived' };
      }),

    /**
     * List owner's machines
     */
    list: publicProcedure
      .input(z.object({
        ownerId: z.string(),
        includeArchived: z.boolean().default(false),
      }))
      .query(async ({ input }) => {
        // Get owner's account
        const account = await db
          .select({
            accountId: userAccounts.accountId,
          })
          .from(userAccounts)
          .innerJoin(businessAccounts, eq(userAccounts.accountId, businessAccounts.id))
          .where(
            and(
              eq(userAccounts.userId, input.ownerId),
              eq(businessAccounts.type, 'renter')
            )
          )
          .limit(1);

        if (!account[0]) {
          return [];
        }

        // Get templates with instance counts and booking stats
        const templates = await db
          .select({
            template: machineTemplates,
            instanceCount: sql<number>`count(distinct ${machineInstances.id})`,
            activeInstanceCount: sql<number>`
              count(distinct case when ${machineInstances.status} = 'active' then ${machineInstances.id} end)
            `,
            bookingCount: sql<number>`
              count(distinct ${machineBookings.id})
            `,
            activeBookingCount: sql<number>`
              count(distinct case when ${machineBookings.status} = 'approved_by_renter'
                and ${machineBookings.endTime} > now() then ${machineBookings.id} end)
            `,
          })
          .from(machineTemplates)
          .leftJoin(machineInstances, eq(machineTemplates.id, machineInstances.templateId))
          .leftJoin(machineBookings, eq(machineTemplates.id, machineBookings.templateId))
          .where(eq(machineTemplates.accountId, account[0].accountId))
          .groupBy(machineTemplates.id)
          .orderBy(desc(machineTemplates.createdAt));

        return templates.map(row => ({
          ...row.template,
          stats: {
            instanceCount: Number(row.instanceCount),
            activeInstanceCount: Number(row.activeInstanceCount),
            bookingCount: Number(row.bookingCount),
            activeBookingCount: Number(row.activeBookingCount),
          },
        }));
      }),
  }),

  /**
   * Booking Management
   */
  bookings: router({
    /**
     * List all bookings for owner's machines
     */
    listAll: publicProcedure
      .input(listBookingsSchema)
      .query(async ({ input }) => {
        // Get owner's account
        const account = await db
          .select({
            accountId: userAccounts.accountId,
          })
          .from(userAccounts)
          .innerJoin(businessAccounts, eq(userAccounts.accountId, businessAccounts.id))
          .where(
            and(
              eq(userAccounts.userId, input.ownerId),
              eq(businessAccounts.type, 'renter')
            )
          )
          .limit(1);

        if (!account[0]) {
          return [];
        }

        // Build query conditions
        const conditions = [
          sql`${machineTemplates.accountId} = ${account[0].accountId}`
        ];

        if (input.machineId) {
          conditions.push(eq(machineBookings.templateId, input.machineId));
        }

        if (input.status) {
          conditions.push(eq(machineBookings.status, input.status));
        }

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
            clientAccount: businessAccounts,
          })
          .from(machineBookings)
          .innerJoin(machineInstances, eq(machineBookings.machineInstanceId, machineInstances.id))
          .innerJoin(machineTemplates, eq(machineBookings.templateId, machineTemplates.id))
          .innerJoin(businessAccounts, eq(machineBookings.clientAccountId, businessAccounts.id))
          .where(and(...conditions))
          .limit(input.limit)
          .offset(input.offset)
          .orderBy(desc(machineBookings.createdAt));

        return bookings.map(row => ({
          ...row.booking,
          instanceCode: row.instance.instanceCode,
          machineName: row.template.name,
          machineCode: row.template.code,
          pricePerHour: row.template.pricePerHour,
          clientName: row.clientAccount.name,
        }));
      }),

    /**
     * Get bookings for a specific machine
     */
    listByMachine: publicProcedure
      .input(z.object({
        machineId: z.string().uuid(),
        ownerId: z.string(),
      }))
      .query(async ({ input }) => {
        const bookings = await db
          .select({
            booking: machineBookings,
            instance: machineInstances,
          })
          .from(machineBookings)
          .innerJoin(machineInstances, eq(machineBookings.machineInstanceId, machineInstances.id))
          .where(eq(machineBookings.templateId, input.machineId))
          .orderBy(desc(machineBookings.startTime));

        return bookings.map(row => ({
          ...row.booking,
          instanceCode: row.instance.instanceCode,
        }));
      }),

    /**
     * Approve a booking
     */
    approve: publicProcedure
      .input(updateBookingStatusSchema)
      .mutation(async ({ input }) => {
        return updateBookingStatus(
          input.bookingId,
          BookingStatus.APPROVED_BY_RENTER,
          input.message,
          input.ownerId
        );
      }),

    /**
     * Reject a booking
     */
    reject: publicProcedure
      .input(updateBookingStatusSchema)
      .mutation(async ({ input }) => {
        return updateBookingStatus(
          input.bookingId,
          BookingStatus.REJECTED_BY_RENTER,
          input.message,
          input.ownerId
        );
      }),

    /**
     * Send booking back to client for changes
     */
    sendBack: publicProcedure
      .input(updateBookingStatusSchema)
      .mutation(async ({ input }) => {
        return updateBookingStatus(
          input.bookingId,
          BookingStatus.SENT_BACK_TO_CLIENT,
          input.message,
          input.ownerId
        );
      }),

    /**
     * Send a message to the client
     */
    sendMessage: publicProcedure
      .input(z.object({
        bookingId: z.string().uuid(),
        content: z.string().min(1).max(1000),
        ownerId: z.string(),
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

        const updatedMessages = addBookingMessage(
          booking[0],
          input.ownerId,
          input.content
        );

        const [updated] = await db
          .update(machineBookings)
          .set({ messages: updatedMessages })
          .where(eq(machineBookings.id, input.bookingId))
          .returning();

        return updated;
      }),
  }),

  /**
   * Analytics & Visualization
   */
  analytics: router({
    /**
     * Get Gantt chart data for bookings
     */
    ganttData: publicProcedure
      .input(z.object({
        ownerId: z.string(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        // Get owner's account
        const account = await db
          .select({
            accountId: userAccounts.accountId,
          })
          .from(userAccounts)
          .innerJoin(businessAccounts, eq(userAccounts.accountId, businessAccounts.id))
          .where(
            and(
              eq(userAccounts.userId, input.ownerId),
              eq(businessAccounts.type, 'renter')
            )
          )
          .limit(1);

        if (!account[0]) {
          return { machines: [], bookings: [] };
        }

        // Get machines
        const machines = await db
          .select({
            id: machineTemplates.id,
            name: machineTemplates.name,
            code: machineTemplates.code,
          })
          .from(machineTemplates)
          .where(eq(machineTemplates.accountId, account[0].accountId))
          .orderBy(machineTemplates.name);

        // Get bookings in date range
        const bookings = await db
          .select({
            id: machineBookings.id,
            machineId: machineBookings.templateId,
            instanceId: machineBookings.machineInstanceId,
            instanceCode: machineInstances.instanceCode,
            startTime: machineBookings.startTime,
            endTime: machineBookings.endTime,
            status: machineBookings.status,
            label: machineBookings.label,
          })
          .from(machineBookings)
          .innerJoin(machineInstances, eq(machineBookings.machineInstanceId, machineInstances.id))
          .innerJoin(machineTemplates, eq(machineBookings.templateId, machineTemplates.id))
          .where(
            and(
              eq(machineTemplates.accountId, account[0].accountId),
              or(
                and(
                  gte(machineBookings.startTime, new Date(input.startDate)),
                  lte(machineBookings.startTime, new Date(input.endDate))
                ),
                and(
                  gte(machineBookings.endTime, new Date(input.startDate)),
                  lte(machineBookings.endTime, new Date(input.endDate))
                ),
                and(
                  lte(machineBookings.startTime, new Date(input.startDate)),
                  gte(machineBookings.endTime, new Date(input.endDate))
                )
              )
            )
          )
          .orderBy(machineBookings.startTime);

        // Group by machine and instance for Gantt rows
        const ganttRows = machines
          .flatMap(machine => {
          const machineBookings = bookings.filter(b => b.machineId === machine.id);
          const instanceGroups = new Map<string, typeof bookings>();

          machineBookings.forEach(booking => {
            const key = `${machine.id}-${booking.instanceCode}`;
            if (!instanceGroups.has(key)) {
              instanceGroups.set(key, []);
            }
            instanceGroups.get(key)!.push(booking);
          });

            return Array.from(instanceGroups.entries())
              .map(([key, instanceBookings]) => {
                const firstBooking = instanceBookings[0];
                if (!firstBooking) {
                  return null;
                }
                return {
                  id: key,
                  machineId: machine.id,
                  machineName: machine.name,
                  instanceCode: firstBooking.instanceCode,
                  bookings: instanceBookings.map(b => ({
                    id: b.id,
                    start: b.startTime.toISOString(),
                    end: b.endTime.toISOString(),
                    title: b.label || 'Booking',
                    status: b.status,
                    color: getStatusColor(b.status),
                  })),
                };
              })
              .filter((row): row is NonNullable<typeof row> => row !== null);
          })
          .flat();

        return {
          rows: ganttRows,
          dateRange: {
            start: input.startDate,
            end: input.endDate,
          },
        };
      }),

    /**
     * Get dashboard statistics
     */
    dashboardStats: publicProcedure
      .input(z.object({
        ownerId: z.string(),
      }))
      .query(async ({ input }) => {
        // Get owner's account
        const account = await db
          .select({
            accountId: userAccounts.accountId,
          })
          .from(userAccounts)
          .innerJoin(businessAccounts, eq(userAccounts.accountId, businessAccounts.id))
          .where(
            and(
              eq(userAccounts.userId, input.ownerId),
              eq(businessAccounts.type, 'renter')
            )
          )
          .limit(1);

        if (!account[0]) {
          return {
            totalMachines: 0,
            totalBookings: 0,
            pendingBookings: 0,
            activeBookings: 0,
            totalRevenue: 0,
          };
        }

        const stats = await db
          .select({
            totalMachines: sql<number>`count(distinct ${machineTemplates.id})`,
            totalBookings: sql<number>`count(distinct ${machineBookings.id})`,
            pendingBookings: sql<number>`
              count(distinct case when ${machineBookings.status} = 'pending_renter_approval'
                then ${machineBookings.id} end)
            `,
            activeBookings: sql<number>`
              count(distinct case when ${machineBookings.status} = 'approved_by_renter'
                and ${machineBookings.endTime} > now() then ${machineBookings.id} end)
            `,
            totalRevenue: sql<number>`
              coalesce(sum(
                case when ${machineBookings.status} = 'approved_by_renter' then
                  extract(epoch from (${machineBookings.endTime} - ${machineBookings.startTime})) / 3600
                  * ${machineTemplates.pricePerHour}
                else 0 end
              ), 0)
            `,
          })
          .from(machineTemplates)
          .leftJoin(machineBookings, eq(machineTemplates.id, machineBookings.templateId))
          .where(eq(machineTemplates.accountId, account[0].accountId));

        return {
          totalMachines: Number(stats[0]?.totalMachines || 0),
          totalBookings: Number(stats[0]?.totalBookings || 0),
          pendingBookings: Number(stats[0]?.pendingBookings || 0),
          activeBookings: Number(stats[0]?.activeBookings || 0),
          totalRevenue: Math.round(Number(stats[0]?.totalRevenue || 0)),
        };
      }),
  }),
});

// Helper function to update booking status
async function updateBookingStatus(
  bookingId: string,
  newStatus: string,
  message: string | undefined,
  userId: string
): Promise<any> {
  const booking = await db
    .select()
    .from(machineBookings)
    .where(eq(machineBookings.id, bookingId))
    .limit(1);

  if (!booking[0]) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Booking not found',
    });
  }

  // Check if transition is allowed
  const canTransition = canTransitionStatus(
    booking[0].status,
    newStatus,
    'renter'
  );

  if (!canTransition) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Cannot transition from ${booking[0].status} to ${newStatus}`,
    });
  }

  const updateData: any = {
    status: newStatus,
  };

  if (message) {
    const updatedMessages = addBookingMessage(
      booking[0],
      userId,
      `Status changed to ${newStatus}: ${message}`
    );
    updateData.messages = updatedMessages;
  }

  const [updated] = await db
    .update(machineBookings)
    .set(updateData)
    .where(eq(machineBookings.id, bookingId))
    .returning();

  return updated;
}

// Helper function to get status color
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending_renter_approval: '#FFA500',
    approved_by_renter: '#22C55E',
    rejected_by_renter: '#EF4444',
    sent_back_to_client: '#F97316',
    canceled_by_client: '#9CA3AF',
  };
  return colors[status] || '#6B7280';
}