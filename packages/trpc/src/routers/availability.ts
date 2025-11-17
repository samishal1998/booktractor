import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../trpc';
import { db } from '@booktractor/db/client';
import {
  machineTemplates,
  machineInstances,
  machineBookings,
} from '@booktractor/db/schemas';
import { eq, and, gte, lte, or, sql } from 'drizzle-orm';
import { findAvailableInstances } from 'app/lib/services/availability';

// Input schemas
const checkAvailabilitySchema = z.object({
  templateId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  requestedCount: z.number().int().min(1).default(1),
});

const getTemplateScheduleSchema = z.object({
  templateId: z.string().uuid(),
});

const getAvailableInstancesSchema = z.object({
  templateId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

export const availabilityRouter = router({
  /**
   * Check availability for a template
   * Returns how many units are available for the requested time range
   * Public - anyone can check availability
   */
  check: publicProcedure
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
          message: 'Machine template not found',
        });
      }

      // Get all active instances
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
        return {
          templateId: input.templateId,
          templateName: template[0].name,
          requestedCount: input.requestedCount,
          availableCount: 0,
          isAvailable: false,
          message: 'No active instances available',
        };
      }

      // Get existing bookings for the time range
      const startTime = new Date(input.startTime);
      const endTime = new Date(input.endTime);

      const existingBookings = await db
        .select()
        .from(machineBookings)
        .where(
          and(
            eq(machineBookings.templateId, input.templateId),
            // Exclude cancelled/rejected bookings
            and(
              sql`${machineBookings.status} != 'canceled_by_client'`,
              sql`${machineBookings.status} != 'rejected_by_renter'`
            ),
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

      // Find available instances
      const availability = findAvailableInstances(
        instances,
        existingBookings,
        startTime,
        endTime,
        input.requestedCount
      );

      return {
        templateId: input.templateId,
        templateName: template[0].name,
        requestedCount: input.requestedCount,
        availableCount: availability.availableCount,
        isAvailable: availability.availableCount >= input.requestedCount,
        availableInstances: availability.availableInstances
          .filter(i => i.isAvailable)
          .map(i => ({
            instanceId: i.instanceId,
            instanceCode: i.instanceCode,
          })),
        message: availability.availableCount >= input.requestedCount
          ? `${availability.availableCount} units available`
          : `Only ${availability.availableCount} of ${input.requestedCount} units available`,
      };
    }),

  /**
   * Get the availability schedule for a template
   * Shows the default schedule and any overrides
   * Public - anyone can see schedules
   */
  getTemplateSchedule: publicProcedure
    .input(getTemplateScheduleSchema)
    .query(async ({ input }) => {
      const template = await db
        .select({
          id: machineTemplates.id,
          name: machineTemplates.name,
          availabilityJson: machineTemplates.availabilityJson,
        })
        .from(machineTemplates)
        .where(eq(machineTemplates.id, input.templateId))
        .limit(1);

      if (!template[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Machine template not found',
        });
      }

      return {
        templateId: template[0].id,
        templateName: template[0].name,
        availability: template[0].availabilityJson || {
          base: {},
          overrides: {},
        },
      };
    }),

  /**
   * Get specific available instances for a time range
   * More detailed than check - returns actual instance info
   * Public - for booking preview
   */
  getAvailableInstances: publicProcedure
    .input(getAvailableInstancesSchema)
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
          message: 'Machine template not found',
        });
      }

      // Get all active instances with their details
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
        return {
          templateId: input.templateId,
          templateName: template[0].name,
          totalInstances: 0,
          availableInstances: [],
        };
      }

      // Get existing bookings
      const startTime = new Date(input.startTime);
      const endTime = new Date(input.endTime);

      const existingBookings = await db
        .select()
        .from(machineBookings)
        .where(
          and(
            eq(machineBookings.templateId, input.templateId),
            // Exclude cancelled/rejected bookings
            and(
              sql`${machineBookings.status} != 'canceled_by_client'`,
              sql`${machineBookings.status} != 'rejected_by_renter'`
            ),
            // Find overlapping bookings
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
        instances.length // Check all instances
      );

      // Map to detailed response
      const instanceDetails = instances.map(instance => {
        const availabilityCheck = availability.availableInstances.find(
          a => a.instanceId === instance.id
        );

        return {
          id: instance.id,
          instanceCode: instance.instanceCode,
          isAvailable: availabilityCheck?.isAvailable || false,
          status: instance.status,
          availabilityJson: instance.availabilityJson,
          conflicts: availabilityCheck?.conflicts?.map(c => ({
            bookingId: c.id,
            startTime: c.startTime.toISOString(),
            endTime: c.endTime.toISOString(),
            status: c.status,
          })) || [],
        };
      });

      return {
        templateId: input.templateId,
        templateName: template[0].name,
        totalInstances: instances.length,
        availableCount: instanceDetails.filter(i => i.isAvailable).length,
        instances: instanceDetails,
      };
    }),

  /**
   * Get calendar view of bookings for a template
   * Useful for showing a visual calendar of availability
   * Public - shows anonymized booking blocks
   */
  getCalendarView: publicProcedure
    .input(z.object({
      templateId: z.string().uuid(),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    }))
    .query(async ({ input }) => {
      // Get template
      const template = await db
        .select({
          id: machineTemplates.id,
          name: machineTemplates.name,
          totalCount: machineTemplates.totalCount,
        })
        .from(machineTemplates)
        .where(eq(machineTemplates.id, input.templateId))
        .limit(1);

      if (!template[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Machine template not found',
        });
      }

      // Get all bookings in the date range
      const bookings = await db
        .select({
          id: machineBookings.id,
          instanceId: machineBookings.machineInstanceId,
          startTime: machineBookings.startTime,
          endTime: machineBookings.endTime,
          status: machineBookings.status,
          instanceCode: machineInstances.instanceCode,
        })
        .from(machineBookings)
        .innerJoin(machineInstances, eq(machineBookings.machineInstanceId, machineInstances.id))
        .where(
          and(
            eq(machineBookings.templateId, input.templateId),
            // Exclude cancelled/rejected
            and(
              sql`${machineBookings.status} != 'canceled_by_client'`,
              sql`${machineBookings.status} != 'rejected_by_renter'`
            ),
            // Overlaps with date range
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

      // Group bookings by date for calendar view
      const bookingsByDate = new Map<string, Array<{
        instanceCode: string;
        startTime: string;
        endTime: string;
        status: string;
      }>>();

      for (const booking of bookings) {
        const dateKey = booking.startTime.toISOString().split('T')[0];
        if (!dateKey) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to get date key from booking start time',
          });
        }
        if (!bookingsByDate.has(dateKey)) {
          bookingsByDate.set(dateKey, []);
        }
        bookingsByDate.get(dateKey)!.push({
          instanceCode: booking.instanceCode,
          startTime: booking.startTime.toISOString(),
          endTime: booking.endTime.toISOString(),
          status: booking.status,
        });
      }

      return {
        templateId: template[0].id,
        templateName: template[0].name,
        totalUnits: template[0].totalCount,
        dateRange: {
          start: input.startDate,
          end: input.endDate,
        },
        bookingsByDate: Object.fromEntries(bookingsByDate),
        totalBookings: bookings.length,
      };
    }),
});