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
| Store name | Overtaek - Compete on Effort (icon: Overtaek) |
| Bundle / package | `com.overtaek.app` (iOS + Android) |
| Deep link scheme | `overtaek://` |
| HealthKit / Health Connect strings + permissions | In `apps/mobile/app.json` |
| Privacy + Terms (web + in-app) | `/privacy`, `/terms` |
| EAS build profiles + **production public env** | `apps/mobile/eas.json` (API URL, battles + rankings publishable keys, demo off) |
| Support email | `jerrry333x@gmail.com` |
| Store questionnaire drafts | Below |

## Waiting on you

1. **Expo** — linked (`bea1932b-6a00-4edc-9710-22350423c446`, slug `fitness-battle`).
2. **Apple / Play listings** — use package/bundle **`com.overtaek.app`** and listing name **Overtaek - Compete on Effort** ([`expo-setup.md`](./expo-setup.md)). Do not register `com.fitnessbattle.app`.
3. **Paste back** — preview build success/fail (or error log), and the App Store Connect numeric Apple ID (`ascAppId`) for `eas.json` submit.
4. **Google Play** — whenever enrollment finishes (not blocking iOS).
5. **Store screenshots** — phone frames for listings (after a build you can install).
6. **Legal skim** — confirm privacy/terms are OK for HealthKit / Health Connect.

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
