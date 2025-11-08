

import { QueryClientProvider } from "@tanstack/react-query";
import { TRPCProvider } from "../../lib/trpc";
import { useState } from "react";
import { getQueryClient } from "../../lib/trpc";
import { authClient } from "../../lib/auth-client.native";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@booktractor/trpc/routers";
import superjson from "superjson";

export function TrpcProvider({ children }: { children: React.ReactNode }) {
    const queryClient = getQueryClient();
    const [_trpcClient] = useState(() =>  
      createTRPCClient<AppRouter>({
        links: [
          httpBatchLink({
            url: `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/trpc`,
            transformer: superjson,
            headers() {
              const headers = new Map<string, string>(); 
                const cookies = authClient.getCookie(); 
                if (cookies) { 
                  headers.set("Cookie", cookies); 
                
              } 
              return Object.fromEntries(headers); 
            }
          }),
        ],
      })      );
    return (
      <QueryClientProvider client={queryClient}>
        <TRPCProvider trpcClient={_trpcClient} queryClient={queryClient}>
          {children}
        </TRPCProvider>
      </QueryClientProvider>
    );
  }