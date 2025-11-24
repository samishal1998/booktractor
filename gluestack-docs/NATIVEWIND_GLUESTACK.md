# NativeWind + Gluestack Interop Notes

These notes capture everything we learned while wiring **Gluestack UI v1** into the NativeWind-powered Solito stack. Keep this around in case we decide to resurrect the Gluestack theme layer later.

---

## 1. Installing the Required Packages

```bash
yarn workspace @booktractor/app add \
  @gluestack-ui/themed@^1.1.73 \
  @gluestack-ui/config@^1.1.20 \
  @gluestack-style/react@^1.0.57 \
  @gluestack-ui/nativewind-utils@^1.0.28 \
  @gluestack-ui/toast@^1.0.9 \
  @gluestack-ui/overlay@^0.1.22 \
  @gluestack-ui/divider@^0.1.10 \
  @gluestack-ui/pressable@^0.1.23 \
  @gluestack-ui/form-control@^0.1.19 \
  @gluestack-ui/button@^1.0.14 \
  @gluestack-ui/input@^0.1.38
```

> **Note:** `react-native-svg@^15.14.0` is required for all Gluestack icon primitives.  
> Expo automatically configures this on native, but Next.js needs `next-transpile-modules` or Turbopack aliases.

---

## 2. Provider Hierarchy

```tsx
// packages/app/provider/gluestack/index.tsx
import { GluestackUIProvider } from '@gluestack-ui/themed'
import { config } from '@gluestack-ui/config'

export function GluestackProvider({ children }: { children: React.ReactNode }) {
  return (
    <GluestackUIProvider config={config}>
      {children}
    </GluestackUIProvider>
  )
}
```

```tsx
// packages/app/provider/index.tsx
export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <GluestackProvider>
      <TrpcProvider>
        <SafeArea>
          <NavigationProvider>{children as React.ReactElement}</NavigationProvider>
        </SafeArea>
      </TrpcProvider>
    </GluestackProvider>
  )
}
```

---

## 3. NativeWind Interop

Gluestack ships its own styling system, but we still wanted Tailwind utilities for quick layout tweaks. The approach:

1. **Keep NativeWind configured** (already in `apps/expo/babel.config.js` and `apps/next/tailwind.config.js`).
2. **Wrap Gluestack components when necessary**:
   - Gluestack exposes `sx` props for theming; use those for token-based colors.
   - Use NativeWind’s `className` on surrounding React Native primitives.
3. **SafeArea**: keep using our SafeArea provider (react-native-safe-area-context) even though Gluestack offers alternatives—this keeps parity with the non-Gluestack build.

---

## 4. Next.js & Turbopack Gotchas

Turbopack complained about several Gluestack packages that publish plain `.js`/`.jsx` files without explicit module types. Fixes:

- Add `transpilePackages` entries in `apps/next/next.config.js`.
- Provide Turbopack aliases for `react-native` → `react-native-web`.
- Ensure `react-native-svg` has a browser-friendly export (Turbopack sometimes needs `next-transpile-modules`, but the alias block we have usually works).

If Turbopack keeps erroring, fall back to classic Webpack while developing the Gluestack UI (`NEXT_RUNTIME=webpack yarn web`).

---

## 5. Expo Specifics

Expo handled Gluestack without extra config, but we took these precautions:

- Verified `expo install react-native-svg`.
- Cleared Metro cache after adding `@gluestack-*` packages: `expo start --clear`.
- Added `@gluestack-ui/nativewind-utils` to Babel/tsconfig path aliases so Metro resolves correctly.

---

## 6. When to Switch Back

Reasons to consider re-enabling Gluestack:

- Need a themeable component kit with built-in state + tokens.
- Want parity across native/web without hand-rolling every component.
- Desire for faster prototyping (forms/alerts/spinners ready-made).

Reasons to stay on plain RN + NativeWind:

- Total control over bundle size and styling.
- Fewer Turbopack/Web bundler headaches.
- Easier to customize per platform.

---

## 7. Migration Plan (If Re-enabling)

1. `yarn install` the packages listed above.
2. Restore `packages/app/provider/gluestack/index.tsx` and wrap the shared provider.
3. Convert key screens (auth, dashboards) back to Gluestack components:
   - Replace `View`/`TextInput` combos with `Box`, `Input`, `Button`, etc.
   - Reapply validation widgets (`FormControl`, `Alert`).
4. Smoke test on:
   - Expo iOS/Android (`yarn native`).
   - Next.js development server (`yarn web`).
5. Update docs (`CLAUDE.md`, `PROJECT_RULES.md`) to signal that Gluestack is active again.

Keeping this playbook in `gluestack-docs/` lets us flip the switch when product requirements demand a richer component suite.

