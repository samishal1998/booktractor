'use client'

import { SafeArea } from './safe-area'
import { NavigationProvider } from './navigation'
import { TrpcProvider } from './trpc'
import { GluestackProvider } from './gluestack'

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <GluestackProvider>
      <TrpcProvider>
        <SafeArea>
          <NavigationProvider>
            {children as React.ReactElement}
          </NavigationProvider>
        </SafeArea>
      </TrpcProvider>
    </GluestackProvider>
  )
}
