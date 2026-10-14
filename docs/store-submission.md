# Store submission checklist

What is ready in the repo versus what only a human account holder can finish.

Production web origin used below: `https://fitness-battle-one.vercel.app`

## Already prepared in-repo

| Item | Status |
| --- | --- |
| Product parity (My week / Matchups / Moves / You, auth, onboarding, pace, rankings, privacy) | Done |
| Rally visual theme (plum / tennis, Archivo Black, Ace) | Done on mobile (matches web default) |
| Bundle IDs | `com.fitnessbattle.app` (iOS + Android) |
| Deep link scheme | `fitnessbattle://` |
| HealthKit usage strings + Health Connect permissions | In `apps/mobile/app.json` |
| Privacy policy (web + in-app) | `/privacy` |
| Terms of use (web + in-app) | `/terms` |
| EAS build profiles | `apps/mobile/eas.json` (development / preview / production) |
| App icon / splash placeholders | Lime athletic solids — replace before review if you want a branded mark |
| Store questionnaire drafts | See below |

## Blocked on you (accounts & secrets)

These cannot be completed from this agent environment:

1. **Expo account** — `eas login`, then `cd apps/mobile && eas init` (replaces placeholder `extra.eas.projectId`).
2. **Apple Developer Program** ($99/yr) — App Store Connect app record, signing (EAS can manage certs), HealthKit capability.
3. **Google Play Console** ($25 one-time) — app listing, Play App Signing, Health Connect declaration.
4. **Production mobile env** — EAS secrets / `eas.json` `env` for:
   - `EXPO_PUBLIC_API_URL=https://fitness-battle-one.vercel.app`
   - `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (live project)
   - `EXPO_PUBLIC_USE_DEMO_DATA=false`
   - Optional: `EXPO_PUBLIC_RANKINGS_SUPABASE_*`
5. **Support identity** — confirm public support email (privacy currently lists `3jerryliu@gmail.com`) and any marketing site URL.
6. **Store screenshots** — phone-sized App Store / Play screenshots (we have Expo web demos; stores want device frames).
7. **Final legal confirmation** — you (or counsel) approve privacy/terms wording for HealthKit / Health Connect.

## Commands once Expo is linked

```bash
cd apps/mobile

# After eas login + eas init
pnpm eas:build:ios      # production iOS
pnpm eas:build:android # production Android AAB

# After builds succeed and store listings exist
pnpm eas:submit:ios
pnpm eas:submit:android
```

Set production env on the EAS project (dashboard or CLI), not in git:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://fitness-battle-one.vercel.app
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value <url>
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon>
eas secret:create --scope project --name EXPO_PUBLIC_USE_DEMO_DATA --value false
```

## App Store Connect — Privacy Nutrition (draft)

| Data type | Collected? | Linked to identity? | Used for tracking? | Purpose |
| --- | --- | --- | --- | --- |
| Contact info (email) | Yes | Yes | No | App functionality / account |
| Name (display name) | Yes | Yes | No | App functionality |
| Fitness / workout data | Yes (when user syncs) | Yes | No | App functionality |
| Health / sleep (if synced) | Yes (when user syncs) | Yes | No | App functionality |
| Product interaction | Minimal (local compete state / server when live) | Yes | No | App functionality |
| Diagnostics | Host logs may include IP / UA | No (not for ads) | No | Analytics / security (if you enable) |

**HealthKit:** declare read of Workouts (and Sleep if you sync nights). We do **not** write HealthKit. Usage string is already set.

**Encryption:** `ITSAppUsesNonExemptEncryption` is `false` (HTTPS only).

**Age rating:** suggest 4+ / no unrestricted web, no gambling; confirm in questionnaire.

## Google Play — Data safety (draft)

| Data | Collected | Shared | Purpose |
| --- | --- | --- | --- |
| Email | Yes | No (only infra processors) | Account |
| Name | Yes | Shown to battle peers | Account / social features inside app |
| Health & fitness | Yes, user-initiated sync | No third-party ads | App functionality |
| Approximate location (city string user types) | Optional | Shown on boards | App functionality |

**Health Connect:** declare `READ_EXERCISE`, `READ_HEART_RATE`, `READ_SLEEP` as used for fitness tracking. App must keep a Privacy Policy URL: `https://fitness-battle-one.vercel.app/privacy`.

## What to send back to unblock builds

Reply with:

1. Expo account username (or confirm you ran `eas login` + `eas init` and paste the new `projectId`).
2. Production Supabase URL + anon key (or “use the same project as web production”).
3. Confirm support email for listings.
4. Whether you already have Apple Developer + Play Console, or need the cheapest path order (Play first is often faster).

After that, a follow-up can wire the real `projectId`, kick `eas build`, and walk submit.
