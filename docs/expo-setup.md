# Expo setup (what you run locally)

The agent cannot log into Expo for you. The **project ID is not something you invent** — Expo creates a UUID when you link the app. Until then `apps/mobile/app.json` has a placeholder.

You only need a free [expo.dev](https://expo.dev) account (same email you like for the app is fine).

## 1. One-time: create Expo account + link this app

In a terminal on your machine, from the repo:

```bash
cd apps/mobile

# Install CLI if needed
npm i -g eas-cli
# or: npx eas-cli@latest …

eas login
# browser / email login to expo.dev

eas init
# Choose: create a new project under your account
# Name suggestion: fitness-battle
# When it asks to write projectId into app.json → Yes
```

That replaces `"projectId": "fitness-battle-placeholder"` with a real UUID like `"a1b2c3d4-…"`. **Commit that `app.json` change** (or paste the UUID back here and we will).

Optional: set the Expo owner/slug to match your username:

```bash
# app.json "owner" can be your Expo username instead of "fitness-battle"
```

## 2. Confirm production env (already in eas.json)

These match the **battles** Supabase on Vercel (`NEXT_PUBLIC_SUPABASE_*`), not rankings:

| Variable | Value |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | `https://fitness-battle-one.vercel.app` |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://pxruixccvrykhbjzjqga.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | publishable key from Vercel (wired in `eas.json`) |
| `EXPO_PUBLIC_USE_DEMO_DATA` | `false` |
| Rankings (optional) | separate project `nevwdslqilysyeaccptz` |

Anon/publishable keys are meant to ship in the client (same as web). The **service role** stays server-only and is not in the mobile app.

## 3. After Apple / Play finish approving

```bash
cd apps/mobile

# Internal test builds first (recommended)
eas build --platform android --profile preview
eas build --platform ios --profile preview

# Store builds
eas build --platform android --profile production
eas build --platform ios --profile production
```

iOS needs an Apple Developer team linked (`eas credentials` / build prompts). Android can use EAS-managed keystore on first build.

Submit later (when listings exist):

```bash
eas submit --platform ios --profile production --latest
eas submit --platform android --profile production --latest
```

## What to send back after `eas init`

1. The new `extra.eas.projectId` from `app.json` (or a commit/PR with it).
2. Your Expo username (for `owner` if you want it exact).
3. When Apple/Play are ready: App Store Connect app id + whether you want EAS to manage signing.
