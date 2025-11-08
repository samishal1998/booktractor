import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { expo } from '@better-auth/expo';
import { db } from './src/client';
import * as schema from './src/schemas/auth';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  trustedOrigins: [
    'http://localhost:3000',
    'booktractor://', // Expo deep link scheme
    'booktractor://*', 
    'booktractor-prod://*', 
    'booktractor-staging://*',
    'exp://192.168.1.104:8081', // Expo local development URL
  ],
  plugins: [
    expo(), // Enable Expo support
  ],
  secret: process.env.BETTER_AUTH_SECRET || 'please-set-a-secret-key-at-least-32-chars-long',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
});

export type Auth = typeof auth;
