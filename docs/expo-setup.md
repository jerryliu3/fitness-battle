# Expo setup (what you run locally)

## Ignore these Expo dashboard steps

The Expo “Get started” page is written for a **brand-new** app. For this monorepo:

| Dashboard step | Do this instead |
| --- | --- |
| `npx create-expo-app@latest fitness` | **Skip.** App already lives in `apps/mobile`. |
| Bare `eas init` | **Skip.** It fails here (see below). |
| `npx eas-cli@latest init --id bea1932b-…` | **Run this** (or `pnpm eas:init` in `apps/mobile`). |
| Install Expo Cursor skills | Optional. |
| `npx expo start` | After connect + `pnpm install`, from `apps/mobile` or `pnpm dev:mobile` at repo root. |

## Your Expo project ID

`bea1932b-6a00-4edc-9710-22350423c446`

Already in `apps/mobile/app.json` → `extra.eas.projectId` on the mobile PR branch. You do **not** invent this value.

## Why bare `eas init` failed

```
expo config --json exited with non-zero code: 1
Error: project:init command failed.
```

Bare `eas init` (no `--id`) re-evaluates the whole Expo config before linking. In this pnpm monorepo that often fails on a Mac checkout that is missing a root install or is on an old branch. Use the **connect-by-id** command Expo showed you.

## Connect (run on your Mac)

```bash
# From the fitness-battle repo root
git fetch origin
git checkout cursor/mobile-rally-style-fbce   # has projectId + eas.json production env
pnpm install

cd apps/mobile

# Already logged in — keep that session. Then:
npx eas-cli@latest init --id bea1932b-6a00-4edc-9710-22350423c446

# Same thing via package script:
# pnpm eas:init
```

Expected: EAS confirms the project is linked (or says it is already linked). `app.json` should still show that `projectId`.

### If connect still fails

```bash
cd apps/mobile
npx expo config --type public
```

- If that prints JSON → retry `npx eas-cli@latest init --id bea1932b-6a00-4edc-9710-22350423c446`.
- If that errors → paste the **full** terminal output (not only the `eas` wrapper line).

Optional Cursor skills (from the dashboard; not required for builds):

```bash
npx skills@latest add expo/skills --skill '*' --agent cursor
```

Then restart Cursor.

## Production env (already in eas.json)

Battles Supabase (not rankings), same as Vercel web:

| Variable | Value |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | `https://fitness-battle-one.vercel.app` |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://pxruixccvrykhbjzjqga.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | publishable key (in `eas.json`) |
| `EXPO_PUBLIC_USE_DEMO_DATA` | `false` |

## Builds (after Apple / Play enrollment)

```bash
cd apps/mobile

npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile preview

npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

## What to reply with

1. Whether `npx eas-cli@latest init --id bea1932b-6a00-4edc-9710-22350423c446` succeeded.
2. If it failed, the full `npx expo config --type public` error.
3. Your Expo username (optional), if you want `owner` set in `app.json`.
