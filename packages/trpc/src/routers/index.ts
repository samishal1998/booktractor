import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { db } from '@booktractor/db/client';
import { users as usersTable } from '@booktractor/db/schemas';
import { eq } from 'drizzle-orm';

// Import business routers
import { machinesRouter } from './machines';
import { bookingsRouter } from './bookings';
import { availabilityRouter } from './availability';
import { ownerRouter } from './owner';
import { clientRouter } from './client';
import { userProfileRouter } from './user-profile';

export const appRouter = router({
  // Legacy user endpoints (can be removed later)
  user: {
    dummy: publicProcedure.query(async ({ ctx }) => {
      return {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        ctx: ctx.user,
      }
    }),
    list: publicProcedure.query(async () => {
      // Retrieve users from a datasource, this is an imaginary database
      const users = await db.select().from(usersTable);
      //    ^?
      return users;
    }),
    byId: publicProcedure.input(z.object({ id: z.string() })).query(async (opts) => {
      const { input } = opts;
      //      ^?
      // Retrieve the user with the given ID
      const user = await db.select().from(usersTable).where(eq(usersTable.id, input.id));
      return user[0];
    }),
  },

  // Business domain routers
  machines: machinesRouter,
  bookings: bookingsRouter,
  availability: availabilityRouter,
  owner: ownerRouter,
  client: clientRouter,
  profile: userProfileRouter,

  // Example endpoints (can be removed later)
  examples: {
    iterable: publicProcedure.query(async function* () {
      for (let i = 0; i < 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        yield i;
      }
    }),
  },
});

// Export type router type signature, this is used by the client.
export type AppRouter = typeof appRouter;