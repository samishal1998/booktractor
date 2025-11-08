import { QueryClientProvider } from "@tanstack/react-query";
import { trpcClient, TRPCProvider } from "../../lib/trpc";
import { useState } from "react";
import { getQueryClient } from "../../lib/trpc";

export function TrpcProvider({ children }: { children: React.ReactNode }) {
    const queryClient = getQueryClient();
    const [_trpcClient] = useState(() =>  trpcClient    );
    return (
      <QueryClientProvider client={queryClient}>
        <TRPCProvider trpcClient={_trpcClient} queryClient={queryClient}>
          {children}
        </TRPCProvider>
      </QueryClientProvider>
    );
  }