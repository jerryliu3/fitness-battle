# Overtaek — Expo → App Store (do this on your Mac)

## How the pieces connect (no magic button)

| Piece | Role |
| --- | --- |
| **Expo project** (`bea1932b-…`) | Cloud builds (EAS). Already linked when you ran `init --id`. |
| **Apple App ID** `com.overtaek.app` | Signing identity in developer.apple.com (certs / profiles). |
| **App Store Connect app** | The store listing. Must use the **same** Bundle ID `com.overtaek.app`. |
| **EAS build** | Produces an `.ipa` signed as `com.overtaek.app`. |
| **`ascAppId`** | Numeric Apple ID from App Store Connect → tells `eas submit` *which listing* to upload into. |

Connection = **same Bundle ID** on ASC + binary. Submit uses **`ascAppId`**. There is no separate “link Expo to ASC” screen.

## Status checklist

| Step | Status |
| --- | --- |
| Expo login | Done |
| Expo project linked | Done |
| Apple Developer enrollment | Done |
| App Store Connect app created | You said done — confirm Bundle ID is **`com.overtaek.app`** |
| Merge [#41](https://github.com/jerryliu3/fitness-battle/pull/41) (Overtaek IDs + `eas.json`) | **Do this first** (or checkout that branch) |
| EAS creates certs / profiles | Next command below |
| First cloud build | Same command |
| Paste `ascAppId` into chat | After ASC app exists |
| `eas submit` → TestFlight | After a production (or store) build |

Bigger mobile UI parity ([#27](https://github.com/jerryliu3/fitness-battle/pull/27) / [#30](https://github.com/jerryliu3/fitness-battle/pull/30)) is separate and **not** required to run your first EAS iOS build once #41 is on your machine.

## Store IDs

| Field | Value |
| --- | --- |
| Listing name | Overtaek - Compete on Effort |
| Icon name | Overtaek |
| Bundle ID | `com.overtaek.app` |
| SKU | `overtaek-ios` |
| Expo project ID | `bea1932b-6a00-4edc-9710-22350423c446` |

## Step-by-step remaining (Mac)

### 0. Get the Overtaek config on disk

```bash
cd /Users/jerryliu/Documents/fitness-battle/fitness-battle   # your repo root
git fetch origin
git checkout cursor/overtaek-store-ids-fbce   # or merge #41 into main, then pull main
pnpm install
cd apps/mobile
```

Confirm:

```bash
grep -E 'bundleIdentifier|package|projectId' app.json
# expect com.overtaek.app and bea1932b-…
```

### 1. Confirm App Store Connect matches

In [App Store Connect](https://appstoreconnect.apple.com) → your app → **App Information**:

- Bundle ID = **`com.overtaek.app`** (if it’s still `com.fitnessbattle.app`, fix/recreate before building)
- Copy the numeric **Apple ID** (digits only) → paste in chat later

### 2. Let EAS create certificates + build (this is the main command)

Still in `apps/mobile` (prompt ends with `mobile %` — do **not** `cd apps/mobile` again):

```bash
eas login          # if the session expired
npx eas-cli@latest build --platform ios --profile production
```

Use **`production`** (not preview) if you want a build that can go to TestFlight / App Store.  
`preview` is internal-distribution only and won’t use the normal App Store submit path the same way.

When EAS asks:

| Prompt | Answer |
| --- | --- |
| Log in to Apple | Apple ID for your Developer account |
| Select team | Your paid team |
| Generate a new Apple Distribution Certificate? | **Yes** |
| Generate a new Provisioning Profile? | **Yes** |
| Bundle identifier | Confirm **`com.overtaek.app`** |
| Push notifications / capabilities sync | Allow EAS to sync; keep Push + HealthKit on the App ID |

EAS uploads certs to Expo’s credential store. You do **not** download `.p12` / `.mobileprovision` by hand.

Build runs in the cloud. Open the URL it prints (also on [expo.dev](https://expo.dev) → project Overtaek → Builds).

### 3. Optional: inspect credentials without building

```bash
npx eas-cli@latest credentials
# iOS → production → view / create distribution cert + App Store profile
```

### 4. Submit to TestFlight (after a green production build)

After you paste the numeric Apple ID, we’ll put it in `eas.json` as `ascAppId`. Then:

```bash
npx eas-cli@latest submit --platform ios --profile production --latest
```

Or skip waiting on us and pass it once:

```bash
npx eas-cli@latest submit --platform ios --latest --id YOUR_NUMERIC_APPLE_ID
```

(`--id` here is the App Store Connect app id, not the Expo project id.)

First submit may ask for an App Store Connect API key or Apple login again — follow the prompts; prefer an API key if EAS offers to create one.

### 5. Finish the listing in App Store Connect (human / later)

Screenshots, privacy nutrition, HealthKit usage text, support URL (`https://fitness-battle-one.vercel.app/privacy`), review notes. Not needed for the **first** EAS build; needed before App Review.

## What to paste back here (only this)

1. Confirm Bundle ID on the ASC app is `com.overtaek.app`.
2. Numeric **Apple ID** from App Information (`ascAppId`).
3. Result of the `eas build` command (success URL, or **full** error text).
4. Nothing else — no passwords, no `.p8` / `.p12` files.

## Push notifications note

You enabled Push on the App ID — good for later. The mobile app already has notification settings (master + category toggles) and registers a **stub** device token via `@fitness-battle/shared`. Shipping *actual* APNs/FCM delivery still needs Expo Notifications (or similar) plus a push service. Credentials/build can proceed without that wiring.
