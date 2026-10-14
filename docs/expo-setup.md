# Expo setup (what you run locally)

## Branding (store-facing)

| Field | Value |
| --- | --- |
| App Store / Play **listing name** | Overtaek - Compete on Effort |
| Name under the icon | Overtaek |
| **iOS Bundle ID** | `com.overtaek.app` |
| **Android package name** | `com.overtaek.app` |
| SKU (App Store Connect) | `overtaek-ios` |
| Deep link scheme | `overtaek://` |
| Expo slug | `overtaek` |
| Expo project ID | `bea1932b-6a00-4edc-9710-22350423c446` |

Internal monorepo packages still use `@fitness-battle/*` and the GitHub repo name; that does not appear on the store.

## Status

| Step | Status |
| --- | --- |
| Expo account + login + project link | Done |
| Apple Developer enrollment | Done |
| Register Bundle ID / package `com.overtaek.app` | **You — use this, not `com.fitnessbattle.app`** |
| App Store Connect app + first iOS build | Next |

## Working directory

Commands assume you are in **`apps/mobile`**.

- Prompt already ends in `mobile %` → stay put.
- From monorepo root → `cd apps/mobile`.

## Apple → App Store Connect

1. Open [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **+** → **New App**.
2. Use:
   - **Platforms:** iOS
   - **Name:** `Overtaek - Compete on Effort` (≤30 characters; this fits)
   - **Primary language:** English (U.S.)
   - **Bundle ID:** register/select **`com.overtaek.app`**
   - **SKU:** `overtaek-ios`
3. Subtitle (optional, 30 chars): `Compete on Effort`
4. After it exists, copy the numeric **Apple ID** on App Information → paste in chat for `eas.json` submit.

If you already created an app with `com.fitnessbattle.app`, delete/abandon that App ID and create a new one with `com.overtaek.app` before the first store build.

## First iOS build

```bash
git fetch origin
git checkout cursor/mobile-rally-style-fbce
pnpm install
cd apps/mobile   # skip if already here

npx eas-cli@latest build --platform ios --profile preview
```

When EAS prompts: Apple login → your team → let EAS generate credentials → confirm bundle id `com.overtaek.app`. If it asks about slug `overtaek` vs old `fitness-battle`, choose to align with **`overtaek`**.

## What to send back

1. Preview build success/fail (or full error).
2. App Store Connect numeric Apple ID (`ascAppId`).
3. No passwords or `.p8` keys in chat.

## Production env (already in eas.json)

Battles Supabase + `https://fitness-battle-one.vercel.app` (web hostname unchanged for now).

## Android package (Play Console)

Use the same package name: **`com.overtaek.app`**.
