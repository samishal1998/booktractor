import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../trpc';
import { db } from '@booktractor/db/client';
import {
  machineTemplates,
  machineInstances,
  businessAccounts,
  userAccounts,
  type NewMachineTemplate,
  type NewMachineInstance,
} from '@booktractor/db/schemas';
import { eq, and, sql } from 'drizzle-orm';
import { generateInstanceCodes } from 'app/lib/services/availability';

// Input schemas
const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  description: z.string().optional(),
  totalCount: z.number().int().min(1).max(100),
  pricePerHour: z.number().int().min(0).optional(),
  specs: z.record(z.string(), z.unknown()).optional(),
  availabilityJson: z.object({
    base: z.record(z.string(), z.array(z.object({
      start: z.string(),
      end: z.string()
    }))).optional(),
    overrides: z.record(z.string(), z.array(z.object({
      start: z.string(),
      end: z.string()
    }))).optional(),
  }).optional(),
  tags: z.array(z.number()).optional(),
});

const updateTemplateSchema = createTemplateSchema.partial().extend({
  id: z.string().uuid(),
});

const generateInstancesSchema = z.object({
  templateId: z.string().uuid(),
  count: z.number().int().min(1).max(100).optional(),
});

export const machinesRouter = router({
  // ===================
  // Template procedures
  // ===================

  /**
   * List all machine templates
   * Public for browsing, shows only basic info
   */
  templates: router({
    list: publicProcedure
      .input(z.object({
        accountId: z.string().uuid().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const conditions = [];
        if (input.accountId) {
          conditions.push(eq(machineTemplates.accountId, input.accountId));
        }

        const templates = await db
          .select({
            id: machineTemplates.id,
            name: machineTemplates.name,
            code: machineTemplates.code,
            description: machineTemplates.description,
            totalCount: machineTemplates.totalCount,
            pricePerHour: machineTemplates.pricePerHour,
            accountId: machineTemplates.accountId,
            createdAt: machineTemplates.createdAt,
          })
          .from(machineTemplates)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .limit(input.limit)
          .offset(input.offset);

        return templates;
      }),

    /**
     * Get a single template with full details
     */
    getById: publicProcedure
      .input(z.object({
        id: z.string().uuid(),
      }))
      .query(async ({ input }) => {
        const template = await db
          .select()
          .from(machineTemplates)
          .where(eq(machineTemplates.id, input.id))
          .limit(1);

        if (!template[0]) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Machine template not found',
          });
        }

        // Get instance count
        const instanceCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(machineInstances)
          .where(eq(machineInstances.templateId, input.id));

        return {
          ...template[0],
          instanceCount: Number(instanceCount[0]?.count || 0),
        };
      }),

    /**
     * Create a new machine template
     * Public - temporarily no auth required
     */
    create: publicProcedure
      .input(createTemplateSchema)
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Must be logged in',
          });
        }

        // Get user's renter account
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
              eq(businessAccounts.type, 'renter')
            )
          )
          .limit(1);

        if (!userAccount[0]) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Must have a renter account to create templates',
          });
        }

        const newTemplate: NewMachineTemplate = {
          ...input,
          accountId: userAccount[0].accountId,
        };

        const [template] = await db
          .insert(machineTemplates)
          .values(newTemplate)
          .returning();

        // Auto-generate instances based on totalCount
        if (template && input.totalCount > 0) {
          const instanceCodes = generateInstanceCodes(input.code, input.totalCount);
          const instances: NewMachineInstance[] = instanceCodes.map(code => ({
            templateId: template.id,
            instanceCode: code,
            status: 'active',
            availabilityJson: input.availabilityJson,
          }));

          await db.insert(machineInstances).values(instances);
        }

        return template;
      }),

    /**
     * Update a machine template
     * Public - temporarily no auth required
     */
    update: publicProcedure
      .input(updateTemplateSchema)
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Must be logged in',
          });
        }

        // Verify ownership
        const template = await db
          .select()
          .from(machineTemplates)
          .where(eq(machineTemplates.id, input.id))
          .limit(1);

        if (!template[0]) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Template not found',
          });
        }

        // Check if user has access to this template's account
        const hasAccess = await db
          .select()
          .from(userAccounts)
          .where(
            and(
              eq(userAccounts.userId, ctx.user.id),
              eq(userAccounts.accountId, template[0].accountId)
            )
          )
          .limit(1);

        if (!hasAccess[0]) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to update this template',
          });
        }

        const { id, ...updateData } = input;
        const [updated] = await db
          .update(machineTemplates)
          .set(updateData)
          .where(eq(machineTemplates.id, id))
          .returning();

        return updated;
      }),

    /**
     * Delete a machine template
     * Public - temporarily no auth required
     */
    delete: publicProcedure
      .input(z.object({
        id: z.string().uuid(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Must be logged in',
          });
        }

        // Verify ownership (similar to update)
        const template = await db
          .select()
          .from(machineTemplates)
          .where(eq(machineTemplates.id, input.id))
          .limit(1);

        if (!template[0]) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Template not found',
          });
        }

        const hasAccess = await db
          .select()
          .from(userAccounts)
          .where(
            and(
              eq(userAccounts.userId, ctx.user.id),
              eq(userAccounts.accountId, template[0].accountId)
            )
          )
          .limit(1);

        if (!hasAccess[0]) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to delete this template',
          });
        }

        // Delete will cascade to instances
        await db
          .delete(machineTemplates)
          .where(eq(machineTemplates.id, input.id));

        return { success: true };
      }),
  }),

  // ===================
  // Instance procedures
  // ===================

  /**
   * Instance management
   */
  instances: router({
    /**
     * List instances for a template
     */
    listByTemplate: publicProcedure
      .input(z.object({
        templateId: z.string().uuid(),
      }))
      .query(async ({ input }) => {
        const instances = await db
          .select()
          .from(machineInstances)
          .where(eq(machineInstances.templateId, input.templateId));

        return instances;
      }),

    /**
     * Generate instances for a template
     * Public - temporarily no auth required
     */
    generateForTemplate: publicProcedure
      .input(generateInstancesSchema)
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Must be logged in',
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
            message: 'Template not found',
          });
        }

        // Verify ownership
        const hasAccess = await db
          .select()
          .from(userAccounts)
          .where(
            and(
              eq(userAccounts.userId, ctx.user.id),
              eq(userAccounts.accountId, template[0].accountId)
            )
          )
          .limit(1);

        if (!hasAccess[0]) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to generate instances for this template',
          });
        }

        // Get current instance count
        const existingCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(machineInstances)
          .where(eq(machineInstances.templateId, input.templateId));

        const currentCount = Number(existingCount[0]?.count || 0);
        const countToGenerate = input.count || (template[0].totalCount - currentCount);

        if (countToGenerate <= 0) {
          return { generated: 0, message: 'No instances to generate' };
        }

        // Generate new instances
        const instanceCodes = generateInstanceCodes(
          template[0].code,
          countToGenerate
        ).map((code, idx) => `${code}-${currentCount + idx + 1}`);

        const newInstances: NewMachineInstance[] = instanceCodes.map(code => ({
          templateId: input.templateId,
          instanceCode: code,
          status: 'active',
          availabilityJson: template[0].availabilityJson,
        }));

        await db.insert(machineInstances).values(newInstances);

        return {
          generated: countToGenerate,
          message: `Generated ${countToGenerate} new instances`,
        };
      }),

    /**
     * Update instance availability or status
     * Public - temporarily no auth required
     */
    updateAvailability: publicProcedure
      .input(z.object({
        id: z.string().uuid(),
        availabilityJson: z.object({
          base: z.record(z.string(), z.array(z.object({
            start: z.string(),
            end: z.string()
          }))).optional(),
          overrides: z.record(z.string(), z.array(z.object({
            start: z.string(),
            end: z.string()
          }))).optional(),
        }).optional(),
        status: z.enum(['active', 'maintenance', 'retired']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Must be logged in',
          });
        }

        // Get instance and verify ownership
        const instance = await db
          .select({
            instance: machineInstances,
            template: machineTemplates,
          })
          .from(machineInstances)
          .innerJoin(machineTemplates, eq(machineInstances.templateId, machineTemplates.id))
          .where(eq(machineInstances.id, input.id))
          .limit(1);

        if (!instance[0]) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Instance not found',
          });
        }

        // Verify user has access
        const hasAccess = await db
          .select()
          .from(userAccounts)
          .where(
            and(
              eq(userAccounts.userId, ctx.user.id),
              eq(userAccounts.accountId, instance[0].template.accountId)
            )
          )
          .limit(1);

        if (!hasAccess[0]) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to update this instance',
          });
        }

        const { id, ...updateData } = input;
        const [updated] = await db
          .update(machineInstances)
          .set(updateData)
          .where(eq(machineInstances.id, id))
          .returning();

        return updated;
      }),
  }),
});