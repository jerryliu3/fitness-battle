# Expo setup (what you run locally)

## Your Expo project ID

Expo already created a project for you. The ID is:

`bea1932b-6a00-4edc-9710-22350423c446`

It is written into `apps/mobile/app.json` → `extra.eas.projectId`. You do **not** invent this value.

## Why bare `eas init` failed

```
expo config --json exited with non-zero code: 1
Error: project:init command failed.
```

`eas init` (without `--id`) asks Expo CLI to evaluate the whole app config first. In this pnpm monorepo that step often fails on a fresh Mac checkout (plugins / workspace resolution). Use Expo’s **connect** command instead — it links by ID and skips that broken path.

## Connect this repo (run on your Mac)

From the monorepo root (or `apps/mobile`):

```bash
cd apps/mobile

# Ensure deps are installed from the repo root first
cd ../..
pnpm install
cd apps/mobile

# You already logged in — keep that session
# Then connect to the project Expo showed you:
npx eas-cli@latest init --id bea1932b-6a00-4edc-9710-22350423c446
```

If it still errors on `expo config`, try:

```bash
cd apps/mobile
npx expo config --type public
# If that prints JSON, retry the init --id command.
# If it errors, paste the FULL error output (not just the eas wrapper line).
```

Optional: install Expo’s Cursor skills (from the dashboard):

```bash
npx skills@latest add expo/skills --skill '*' --agent cursor
```

Then restart Cursor. Not required for builds.

## After it links

Confirm `app.json` still has:

```json
"extra": {
  "eas": {
    "projectId": "bea1932b-6a00-4edc-9710-22350423c446"
  }
}
```

Commit if anything else changed (e.g. `owner`).

## Production env (already in eas.json)

Battles Supabase (not rankings), same as Vercel web:

| Variable | Value |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | `https://fitness-battle-one.vercel.app` |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://pxruixccvrykhbjzjqga.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | publishable key (in `eas.json`) |
| `EXPO_PUBLIC_USE_DEMO_DATA` | `false` |

## Builds (after Apple/Play are ready)

```bash
cd apps/mobile

# Internal test first
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile preview

# Store
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

## What to reply with

1. Whether `npx eas-cli@latest init --id bea1932b-6a00-4edc-9710-22350423c446` succeeded.
2. If it failed, the **full** `npx expo config --type public` error.
3. Your Expo username (dashboard URL / profile), if you want `owner` set explicitly.
