# Booktractor 📚

A cross-platform application built with Solito, featuring full-stack authentication with BetterAuth, tRPC, and Drizzle ORM.

## Tech Stack

- **[Solito](https://solito.dev)** - Universal navigation for React Native + Next.js
- **[Next.js 16](https://nextjs.org)** - React framework for the web
- **[Expo 54](https://expo.dev)** - React Native framework for iOS/Android
- **[BetterAuth](https://better-auth.com)** - Full-featured authentication
- **[tRPC](https://trpc.io)** - End-to-end typesafe APIs
- **[Drizzle ORM](https://orm.drizzle.team)** - TypeScript ORM for SQL databases
- **[React 19](https://react.dev)** - UI library
- **[React Navigation 7](https://reactnavigation.org)** - Native navigation

## Features

- ✅ **Cross-platform authentication** (Web + Mobile)
- ✅ **Email/Password authentication**
- ✅ **Google OAuth (SSO)**
- ✅ **Type-safe API layer** with tRPC
- ✅ **Database ORM** with Drizzle + PostgreSQL
- ✅ **Platform-specific code** with `.native.tsx` files
- ✅ **Monorepo structure** for code sharing
- ✅ **Session management** (Cookies on web, SecureStore on native)

## Quick Start

### Prerequisites

- Node.js 18+
- Yarn 4.7.0+
- PostgreSQL database ([Neon](https://neon.tech) recommended)
- Google OAuth credentials (optional, for SSO)

### Installation

```bash
# Install dependencies
yarn install

# Set up environment variables
cp apps/next/.env.local.example apps/next/.env.local
cp apps/expo/.env.example apps/expo/.env

# Edit .env files with your configuration
# See SETUP.md for detailed instructions
```

### Database Setup

```bash
cd packages/db

# Generate migrations
yarn drizzle-kit generate

# Apply migrations
yarn drizzle-kit migrate
```

### Run the App

**Web (Next.js):**
```bash
yarn web
# Visit http://localhost:3000
```

**Mobile (Expo):**
```bash
yarn native
# Press 'i' for iOS or 'a' for Android
```

## Project Structure

```
booktractor/
├── apps/
│   ├── expo/           # React Native app
│   └── next/           # Next.js web app
│       └── pages/
│           └── api/
│               ├── auth/     # BetterAuth endpoints
│               └── trpc/     # tRPC endpoints
├── packages/
│   ├── app/            # Shared UI & business logic
│   │   ├── features/   # Feature-based screens
│   │   ├── lib/        # Utilities & clients
│   │   └── provider/   # Context providers
│   ├── db/             # Database schemas & config
│   │   └── src/
│   │       ├── schemas/      # Drizzle schemas
│   │       └── auth-config.ts # BetterAuth setup
│   └── trpc/           # API layer
│       └── src/
│           └── routers/      # tRPC routers
├── CLAUDE.md           # AI development guide
├── SETUP.md            # Detailed setup instructions
└── README.md           # This file
```

## Authentication Flow

### Registration
1. User enters name, email, and password
2. BetterAuth creates user in database
3. Session created automatically
4. User redirected to home page

### Sign In
- **Email/Password**: Direct authentication via BetterAuth
- **Google OAuth**: Redirects to Google, creates/links account

### Session Management
- **Web**: HTTP-only cookies (secure)
- **Mobile**: Expo SecureStore (encrypted)

## Development

### Adding a New Feature

1. **Create feature in `packages/app/features/`**
```typescript
// packages/app/features/profile/screen.tsx
export function ProfileScreen() {
  return <View><Text>Profile</Text></View>
}
```

2. **Add web page in `apps/next/pages/`**
```typescript
// apps/next/pages/profile.tsx
import { ProfileScreen } from '@booktractor/app/features/profile/screen'
export default ProfileScreen
```

3. **Update native navigation**
```typescript
// packages/app/provider/navigation/index.native.tsx
screens: {
  'profile': 'profile',
}
```

### Platform-Specific Code

Use `.native.tsx` for React Native specific implementations:

```
auth-client.tsx        # Web version
auth-client.native.tsx # Native version
```

The bundler automatically picks the right file based on platform.

### Creating Protected Routes

Use `protectedProcedure` in tRPC:

```typescript
// packages/trpc/src/routers/user.ts
export const userRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    return ctx.user // Guaranteed to exist
  }),
})
```

Use `useSession` in components:

```typescript
import { useSession } from '#lib/auth-client'

function MyComponent() {
  const { data: session } = useSession()

  if (!session) return <Text>Please sign in</Text>

  return <Text>Hello {session.user.name}</Text>
}
```

## Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide with troubleshooting
- **[CLAUDE.md](./CLAUDE.md)** - Development guide and architecture details

## Resources

- [Solito Documentation](https://solito.dev)
- [BetterAuth Documentation](https://www.better-auth.com)
- [tRPC Documentation](https://trpc.io)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Next.js Documentation](https://nextjs.org/docs)
- [Expo Documentation](https://docs.expo.dev)

## Scripts

```bash
# Development
yarn web          # Start Next.js dev server
yarn native       # Start Expo dev server

# Database
cd packages/db
yarn drizzle-kit generate   # Generate migrations
yarn drizzle-kit migrate    # Apply migrations
yarn drizzle-kit studio     # Open database UI

# Dependencies
yarn workspace @booktractor/app add <package>       # Add to app package
yarn workspace @booktractor/next-app add <package>  # Add to Next.js
yarn workspace expo-app add <package>               # Add to Expo
```

## Environment Variables

### Next.js (`.env.local`)
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Random 32+ character secret
- `BETTER_AUTH_URL` - Your app URL
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- `NEXT_PUBLIC_API_URL` - API base URL

### Expo (`.env`)
- `EXPO_PUBLIC_API_URL` - Next.js server URL
- `EXPO_PUBLIC_APP_SCHEME` - Deep link scheme

See `.env.example` files for details.

## Troubleshooting

**Database Connection Issues:**
- Verify `DATABASE_URL` in `.env.local`
- Check database is running and accessible

**Mobile Can't Connect:**
- Update `EXPO_PUBLIC_API_URL` to your computer's local IP
- Ensure Next.js server is running
- Check firewall settings

**OAuth Not Working:**
- Verify redirect URIs in Google Console
- Check client ID and secret are correct
- Ensure HTTPS in production

See [SETUP.md](./SETUP.md#troubleshooting) for more help.

## Next Steps

1. Set up your database (Neon recommended)
2. Configure environment variables
3. Run database migrations
4. Set up Google OAuth (optional)
5. Start building your features!

## License

MIT

---

Built with ❤️ using [Solito](https://solito.dev)
