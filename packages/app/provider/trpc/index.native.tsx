

import { QueryClientProvider } from "@tanstack/react-query";
import { TRPCProvider } from "../../lib/trpc";
import { useState } from "react";
import { getQueryClient } from "../../lib/trpc";
import { authClient } from "../../lib/auth-client.native";
import {
  createTRPCClient,
  httpBatchLink,
  httpLink,
  isNonJsonSerializable,
  splitLink,
} from "@trpc/client";
import type { AppRouter } from "@booktractor/trpc/routers";
import superjson from "superjson";

function buildAuthHeaders() {
  const headers = new Map<string, string>();
  const cookies = authClient.getCookie();
  if (cookies) {
    headers.set("Cookie", cookies);
  }
  return Object.fromEntries(headers);
}

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const apiUrl = `${process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"}/api/trpc`;

  const [_trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        splitLink({
          condition: (op) => isNonJsonSerializable(op.input),
          true: httpLink({
            url: apiUrl,
            transformer: superjson,
            methodOverride: "POST",
            headers: buildAuthHeaders,
          }),
          false: httpBatchLink({
            url: apiUrl,
            transformer: superjson,
            methodOverride: "POST",
            headers: buildAuthHeaders,
          }),
        }),
      ],
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={_trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}