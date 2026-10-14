# Expo setup (what you run locally)

## Status

| Step | Status |
| --- | --- |
| Expo account + `eas login` | Done |
| Link project ID `bea1932b-6a00-4edc-9710-22350423c446` | Done (`Project already linked`) |
| Slug | Keep **`fitness-battle`** in `app.json` (remote was briefly `fitness`; saying yes to overwrite aligned Expo with the repo) |
| Apple Developer / Google Play enrollment | Waiting on you |
| First EAS preview builds | After enrollment |

## Ignore these Expo dashboard steps

The Expo “Get started” page is for a **brand-new** app. For this monorepo:

| Dashboard step | Do this instead |
| --- | --- |
| `npx create-expo-app@latest fitness` | **Skip.** App already lives in `apps/mobile`. |
| Bare `eas init` | **Skip.** Use connect-by-id only. |
| `npx eas-cli@latest init --id bea1932b-…` | **Done** on the mobile branch. |
| Install Expo Cursor skills | Optional. |
| `npx expo start` | From `apps/mobile`, or `pnpm dev:mobile` at repo root. |

## Working directory

Commands below assume you are in **`apps/mobile`**.

- If your prompt already ends in `mobile %`, you are there — do **not** run `cd apps/mobile` again (that path only exists from the repo root).
- From the monorepo root: `cd apps/mobile`.

## Your Expo project ID

`bea1932b-6a00-4edc-9710-22350423c446`

In `apps/mobile/app.json` → `extra.eas.projectId`. Slug must stay `fitness-battle`.

## Why bare `eas init` failed

```
expo config --json exited with non-zero code: 1
Error: project:init command failed.
```

Bare `eas init` (no `--id`) fails in this pnpm monorepo on some Mac checkouts. Connect-by-id is the supported path:

```bash
# From apps/mobile (after git checkout cursor/mobile-rally-style-fbce + pnpm install at root)
npx eas-cli@latest init --id bea1932b-6a00-4edc-9710-22350423c446
# or: pnpm eas:init
```

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
# From apps/mobile
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile preview

npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

## Optional: Expo Cursor skills

```bash
npx skills@latest add expo/skills --skill '*' --agent cursor
```

Then restart Cursor. Not required for builds.
