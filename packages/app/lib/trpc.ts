import type { AppRouter } from '@booktractor/trpc/routers'
import { createTRPCContext } from '@trpc/tanstack-react-query'
import { MutationCache, QueryClient, type QueryKey } from '@tanstack/react-query'

type MutationMeta = {
  invalidateQueryKeys?: QueryKey[]
  skipInvalidate?: boolean
}

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>()
export function makeQueryClient() {
  let queryClient: QueryClient

  const mutationCache = new MutationCache({
    onSuccess: async (_data, _variables, _context, mutation) => {
      const meta = mutation.options.meta as MutationMeta | undefined
      if (!queryClient || meta?.skipInvalidate) {
        return
      }
      if (meta?.invalidateQueryKeys?.length) {
        await Promise.all(
          meta.invalidateQueryKeys.map((queryKey) =>
            queryClient.invalidateQueries({ queryKey, refetchType: 'active' })
          )
        )
        return
      }
      await queryClient.invalidateQueries({ refetchType: 'active' })
    },
  })

  queryClient = new QueryClient({
    mutationCache,
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchInterval: 20 * 1000,
        refetchIntervalInBackground: true,
      },
    },
  })

  return queryClient
}
let browserQueryClient: QueryClient | undefined = undefined
export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}
