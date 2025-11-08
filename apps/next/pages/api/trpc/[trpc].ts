/**
 * This is the API-handler of your app that contains all your API routes.
 * On a bigger app, you will probably want to split this file up into multiple files.
 */
import * as trpcNext from '@trpc/server/adapters/next';
import { appRouter } from '@booktractor/trpc/routers';
import { auth } from '@booktractor/db/auth';
import type { Context } from '@booktractor/trpc/trpc';

// export API handler
export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext: async ({ req }): Promise<Context> => {
    // Get session from BetterAuth
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    return {
      session: session?.session ? {
        ...session.session,
        ipAddress: session.session.ipAddress ?? null,
        userAgent: session.session.userAgent ?? null,
      } : null,
      user: session?.user ? {
        ...session.user,
        image: session.user.image ?? null,
      } : null,
    };
  },
  allowBatching: true,
  allowMethodOverride: true,
  onError(opts) {
    console.error('tRPC Error:', opts.error);
  },
});
