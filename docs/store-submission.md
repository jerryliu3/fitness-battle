# Store submission checklist

What is ready in the repo versus what only a human account holder can finish.

Production web: `https://fitness-battle-one.vercel.app`  
Support email: `jerrry333x@gmail.com`  
Battles Supabase (app): `https://pxruixccvrykhbjzjqga.supabase.co`  
Rankings Supabase (separate): `https://nevwdslqilysyeaccptz.supabase.co`

Expo CLI steps: [`docs/expo-setup.md`](./expo-setup.md)

## Already prepared in-repo

| Item | Status |
| --- | --- |
| Product parity (My week / Matchups / Moves / You, auth, onboarding, pace, rankings, privacy/terms) | Done |
| Rally visual theme | Done on mobile |
| Bundle IDs | `com.fitnessbattle.app` (iOS + Android) |
| Deep link scheme | `fitnessbattle://` |
| HealthKit / Health Connect strings + permissions | In `apps/mobile/app.json` |
| Privacy + Terms (web + in-app) | `/privacy`, `/terms` |
| EAS build profiles + **production public env** | `apps/mobile/eas.json` (API URL, battles + rankings publishable keys, demo off) |
| Support email | `jerrry333x@gmail.com` |
| Store questionnaire drafts | Below |

## Waiting on you

1. **Expo** — account + login done. Project ID is `bea1932b-6a00-4edc-9710-22350423c446` (in `app.json`). Connect with the dashboard command (or `pnpm eas:init` in `apps/mobile`) — see [`expo-setup.md`](./expo-setup.md). Skip `create-expo-app` and bare `eas init`.
2. **Apple Developer / Google Play** — finish enrollment (you said this is in progress). Then create the app listings and link teams when EAS asks.
3. **First builds** — after `eas init`, run preview then production builds from [`expo-setup.md`](./expo-setup.md).
4. **Store screenshots** — phone frames for listings (Expo web demos exist; stores want device screenshots).
5. **Legal skim** — confirm privacy/terms are OK for HealthKit / Health Connect.

## App Store Connect — Privacy Nutrition (draft)

| Data type | Collected? | Linked to identity? | Used for tracking? | Purpose |
| --- | --- | --- | --- | --- |
| Contact info (email) | Yes | Yes | No | App functionality / account |
| Name (display name) | Yes | Yes | No | App functionality |
| Fitness / workout data | Yes (when user syncs) | Yes | No | App functionality |
| Health / sleep (if synced) | Yes (when user syncs) | Yes | No | App functionality |
| Product interaction | Minimal | Yes | No | App functionality |

**HealthKit:** read Workouts (and Sleep if synced). We do not write HealthKit.  
**Encryption:** `ITSAppUsesNonExemptEncryption` is `false`.

## Google Play — Data safety (draft)

| Data | Collected | Shared | Purpose |
| --- | --- | --- | --- |
| Email | Yes | Infra only | Account |
| Name | Yes | Battle peers | App functionality |
| Health & fitness | Yes, user-initiated | No ads | App functionality |
| City string (optional) | Yes | Boards | App functionality |

Privacy Policy URL: `https://fitness-battle-one.vercel.app/privacy`  
Terms URL: `https://fitness-battle-one.vercel.app/terms`
