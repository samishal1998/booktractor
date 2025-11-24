/**
 * This is the API-handler of your app that contains all your API routes.
 * On a bigger app, you will probably want to split this file up into multiple files.
 */
import * as trpcNext from '@trpc/server/adapters/next';
import { appRouter } from '@booktractor/trpc/routers';
import { auth } from '@booktractor/db/auth';
import type { Context } from '@booktractor/trpc/trpc';
import { db } from '@booktractor/db/client';
import { users as usersTable } from '@booktractor/db/schemas';
import { eq } from 'drizzle-orm';

// export API handler
export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext: async ({ req }): Promise<Context> => {
    // Get session from BetterAuth
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });
    const user = session?.user?.id ? await db.select().from(usersTable).where(eq(usersTable.id, session?.user?.id)) : null;

    return {
      session: session?.session ? {
        ...session.session,
        ipAddress: session.session.ipAddress ?? null,
        userAgent: session.session.userAgent ?? null,
      } : null,
      user: user ? user[0] : null,
    };
  },
  allowBatching: true,
  allowMethodOverride: true,
  onError(opts) {
    console.error('tRPC Error:', opts.error);
  },
});

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};
