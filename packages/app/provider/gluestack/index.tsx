import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';

export function GluestackProvider({ children }: { children: React.ReactNode }) {
  return (
    <GluestackUIProvider config={config}>
      {children}
    </GluestackUIProvider>
  );
}
