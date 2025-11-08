import { createAuthClient } from 'better-auth/react';

/**
 * BetterAuth Client for Web (Next.js)
 * Uses cookies for session storage
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

// Export auth hooks for use in components
export const {
  useSession,
  signOut,
  signUp,
} = authClient;

const email = (...args: Parameters<typeof authClient['signIn']['email']>) => {
  console.log('signIn.email', args);
  return authClient.signIn.email(...args);
};
export const signIn = {
  ...authClient.signIn,
  email,
};