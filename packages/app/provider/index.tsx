'use client'

import { SafeArea } from './safe-area'
import { NavigationProvider } from './navigation'
import { TrpcProvider } from './trpc'

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <TrpcProvider>
      <SafeArea>
        <NavigationProvider>
          {children as React.ReactElement}
        </NavigationProvider>
      </SafeArea>
    </TrpcProvider>
  )
}
