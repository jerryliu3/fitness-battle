# Overtaek — Expo → App Store (Mac)

## How it connects

| Piece | Role |
| --- | --- |
| Expo project `30807072-…` (`overtaek`) | Cloud builds (EAS). `app.json` `slug` + `extra.eas.projectId` must match this project — not the older `fitness` / `bea1932b-…` project. |
| Bundle ID `com.overtaek.app` | Must match App Store Connect **and** the built `.ipa` |
| Numeric Apple ID (`ascAppId`) | Tells `eas submit` which listing to upload to (`6822939070`) |

If EAS prints `com.fitnessbattle.app`, you built from an **old branch**. Stop and switch to current `main` (Overtaek IDs are on `main`).

## Correct rebuild (after a wrong `com.fitnessbattle.app` build)

Your first production build succeeded as a smoke test, but it is **not** the store binary. Rebuild on current `main`:

```bash
cd /Users/jerryliu/Documents/fitness-battle/fitness-battle

# Unblock checkout (local edits were blocking git checkout main)
git stash push -u -m "wip before overtaek rebuild"

git fetch origin
git checkout main
git pull origin main

pnpm install
cd apps/mobile

# Sanity check — must say com.overtaek.app
grep -E 'bundleIdentifier|"package"' app.json

npx eas-cli@latest build --platform ios --profile production
```

When EAS asks:

| Prompt | Answer |
| --- | --- |
| Log in to Apple | Yes (same Apple ID / team) |
| Bundle identifier | Must be **`com.overtaek.app`** (EAS will register it if new) |
| Generate Distribution Certificate / Profile | **Yes** (new ones for Overtaek; old Fitness Battle creds are separate) |
| Sync capabilities | HealthKit + Push as you set on the App ID |

Confirm in the credentials summary line:

`All credentials are ready to build … (com.overtaek.app)`

If it still says `com.fitnessbattle.app`, you are not on updated `main` — fix that before uploading again.

## CI: auto build → TestFlight (no laptop)

GitHub Actions workflow: [`.github/workflows/eas-ios-testflight.yml`](../.github/workflows/eas-ios-testflight.yml).

On every push to `main` that touches `apps/mobile`, `packages/shared`, or the lockfile (and on manual **Run workflow**), it:

1. Authenticates with Expo using the `EXPO_ACCESS_TOKEN` repo secret
2. Runs `eas build --platform ios --profile production --non-interactive --wait`
3. If `ASC_APP_ID` is set, runs `eas submit … --id $ASC_APP_ID` into TestFlight

### Secrets (GitHub → Settings → Secrets and variables → Actions)

| Secret | Required | What it is |
| --- | --- | --- |
| `EXPO_ACCESS_TOKEN` | Yes | Expo **account** access token ([expo.dev → Access tokens](https://expo.dev/accounts/[account]/settings/access-tokens)). Same kind of token as for EAS CLI — not a Vercel token. |
| `ASC_APP_ID` | For submit | App Store Connect numeric **Apple ID** (App Information). Not the Expo project id. |

### Prerequisites (one-time, usually on a Mac)

Non-interactive CI only works after EAS already has iOS credentials **on the Overtaek Expo project** (`30807072-…`) from a successful interactive build. Credentials on the old `fitness` project do not carry over.

```bash
cd apps/mobile
# Confirm app.json projectId is 30807072-a0b4-44cd-bd15-ec186e40ceed and slug is overtaek
npx eas-cli@latest build --platform ios --profile production
```

Confirm Bundle ID `com.overtaek.app`. If credentials were never created for this project, the GitHub job will fail until that Mac step (or Expo dashboard credential setup) is done.

Optional: if CI needs to repair Apple credentials, also set Expo’s ASC API key env vars (`EXPO_ASC_*`, `EXPO_APPLE_TEAM_*`) as documented in [Trigger builds from CI](https://docs.expo.dev/build/building-on-ci/).

### After a green Overtaek build (manual / laptop)

1. Paste the new build URL and confirm Bundle ID `com.overtaek.app`.
2. Paste the App Store Connect numeric **Apple ID** (App Information) into GitHub secret `ASC_APP_ID` (preferred for CI) or into `eas.json` → `submit.production.ios.ascAppId`.
3. Then submit (laptop), or re-run the GitHub workflow:

```bash
# from apps/mobile, after ascAppId is set (or pass when prompted)
npx eas-cli@latest submit --platform ios --profile production --latest
```

Or pass the numeric Apple ID once:

```bash
npx eas-cli@latest submit --platform ios --latest --id YOUR_NUMERIC_APPLE_ID
```

(`--id` is the App Store Connect app id, not the Expo project id.)

## Binary requirements (2026)

Production and internal builds use the EAS `sdk-58` image:

| Platform | Image | What it satisfies |
| --- | --- | --- |
| iOS | `macos-tahoe-26.6-xcode-27.1` | Xcode 27.1, which is past the Xcode 26 / iOS 26 SDK minimum. SDK 58 already uses the UIKit scene lifecycle. |
| Android | `ubuntu-26.04-jdk-17-ndk-r27b` | `targetSdkVersion` 36, compile SDK 37. React Native 0.88 builds native code with `ANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON`, and `useLegacyPackaging` is off so those libraries stay 16 KB-aligned in the AAB. |

`app.json` also sets phone-only iOS (`supportsTablet: false`), `ITSAppUsesNonExemptEncryption: false`, Health and photo purpose strings, a `PrivacyInfo` required-reason manifest, and Android permission blocks for location, camera, media reads, and unused Health Connect types. The production Android profile exports an `.aab` for Play App Signing.

Confirm on the next store build, from the artifact rather than this repo: the IPA contains `PrivacyInfo.xcprivacy`, and `bundletool dump config --bundle app.aab` reports `targetSdkVersion` 36.

Reviewer credentials and the Health / GPS walkthrough live in [store/REVIEWER_NOTES.md](store/REVIEWER_NOTES.md). Paste that file into App Store Connect and Play Console. Do not publish it on the marketing site.

## Store IDs

| Field | Value |
| --- | --- |
| Listing name | Overtaek - Compete on Effort |
| Icon name | Overtaek |
| Bundle ID | `com.overtaek.app` |
| SKU | `overtaek-ios` |
| Expo project ID | `30807072-a0b4-44cd-bd15-ec186e40ceed` (slug `overtaek`) |

## Push notifications note

Push capability is on the App ID. Product path:

1. Settings UI (web You + mobile `/settings`) for master + category toggles
2. Physical iOS/Android builds call `expo-notifications` → `ExponentPushToken[…]`
3. Tokens + prefs persist in Supabase (`push_devices`, `notification_preferences`)
4. Server sends through the **Expo Push Service** (`/api/notifications/test` and `/api/notifications/send`), which fans out to APNs/FCM
5. Simulators / demo mode still use stub tokens; outbox status is `stubbed` | `sent` | `failed`

Optional: set `EXPO_ACCESS_TOKEN` on the web server (Expo → Access tokens) for higher Push API limits. Apple Push key / FCM credentials are managed by EAS when you enable push on the project.
