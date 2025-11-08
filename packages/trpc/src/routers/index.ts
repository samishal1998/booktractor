import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { db } from '@booktractor/db/client';
import { users as usersTable } from '@booktractor/db/schemas';
import { eq } from 'drizzle-orm';

export const appRouter = router({
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