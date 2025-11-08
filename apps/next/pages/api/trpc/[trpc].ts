/**
 * This is the API-handler of your app that contains all your API routes.
 * On a bigger app, you will probably want to split this file up into multiple files.
 */
import * as trpcNext from '@trpc/server/adapters/next';
import { appRouter } from '@booktractor/trpc/routers';

// export API handler
export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext: () => {
    console.log('createContext')
    return {
      x: 'y',
    }
  },
  allowBatching: true,
  allowMethodOverride: true,
  middleware(req, res, next) {
    console.log('middleware')
    next()
  },
  onError(opts) {
    console.log('onError', opts)
  },

});
