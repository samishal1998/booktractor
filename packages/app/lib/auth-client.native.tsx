import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
/**
 * BetterAuth Client for Native (Expo)
 * Uses SecureStore for session storage and supports deep linking
 */
export const authClient = createAuthClient({
  baseURL: `${baseURL}`,
  plugins: [
    expoClient({
      scheme: process.env.EXPO_PUBLIC_APP_SCHEME || 'booktractor',
      storagePrefix: 'booktractor',
      storage: SecureStore,
    }),
  ],
});

// Export auth hooks for use in components
export const {
  useSession,
  signOut,
  signUp,
} = authClient;
const email = (...args: Parameters<typeof authClient['signIn']['email']>) => {
  console.log('native','baseURL', baseURL);
  console.log('native','signIn.email', args);
  return authClient.signIn.email(...args);
};
export const signIn = {
  ...authClient.signIn,
  email,
};