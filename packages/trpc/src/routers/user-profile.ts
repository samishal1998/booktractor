import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { db } from '@booktractor/db/client';
import { users as usersTable } from '@booktractor/db/schemas';
import { eq } from 'drizzle-orm';

export const userProfileRouter = router({
  // Get user profile
  getProfile: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const [user] = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          image: usersTable.image,
          phone: usersTable.phone,
          address: usersTable.address,
          city: usersTable.city,
          state: usersTable.state,
          zipCode: usersTable.zipCode,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt,
        })
        .from(usersTable)
        .where(eq(usersTable.id, input.userId));

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    }),

  // Update user profile
  updateProfile: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        name: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        image: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { userId, ...updateData } = input;

      // Remove undefined values
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      if (Object.keys(cleanData).length === 0) {
        throw new Error('No fields to update');
      }

      const [updatedUser] = await db
        .update(usersTable)
        .set({
          ...cleanData,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, userId))
        .returning({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          image: usersTable.image,
          phone: usersTable.phone,
          address: usersTable.address,
          city: usersTable.city,
          state: usersTable.state,
          zipCode: usersTable.zipCode,
          updatedAt: usersTable.updatedAt,
        });

      if (!updatedUser) {
        throw new Error('Failed to update user');
      }

      return updatedUser;
    }),

  // Update profile picture
  updateProfilePicture: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        imageUrl: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      const [updatedUser] = await db
        .update(usersTable)
        .set({
          image: input.imageUrl,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, input.userId))
        .returning({
          id: usersTable.id,
          image: usersTable.image,
        });

      if (!updatedUser) {
        throw new Error('Failed to update profile picture');
      }

      return updatedUser;
    }),

  // Delete user account (soft delete or full delete)
  deleteAccount: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        confirmEmail: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      // First verify the email matches
      const [user] = await db
        .select({ email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, input.userId));

      if (!user || user.email !== input.confirmEmail) {
        throw new Error('Email confirmation does not match');
      }

      // Delete the user (cascade will handle related records)
      await db.delete(usersTable).where(eq(usersTable.id, input.userId));

      return { success: true };
    }),
});
