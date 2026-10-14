# Expo setup (what you run locally)

## Status

| Step | Status |
| --- | --- |
| Expo account + `eas login` | Done |
| Link project ID `bea1932b-6a00-4edc-9710-22350423c446` | Done |
| Slug | Keep **`fitness-battle`** in `app.json` |
| Apple Developer enrollment | Done |
| App Store Connect app + first iOS build | **You — next** |
| Google Play enrollment | Whenever ready (not blocking iOS) |

## Working directory

Commands assume you are in **`apps/mobile`**.

- Prompt already ends in `mobile %` → stay put (do **not** `cd apps/mobile`).
- From monorepo root → `cd apps/mobile`.

## Apple → first iOS build (do this now)

### 1. Create the app in App Store Connect (browser)

1. Open [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **+** → **New App**.
2. Use:
   - **Platforms:** iOS
   - **Name:** Fitness Battle (or whatever is available)
   - **Primary language:** English (U.S.)
   - **Bundle ID:** register/select **`com.fitnessbattle.app`** (must match `app.json`)
   - **SKU:** e.g. `fitness-battle-ios`
3. After it exists, open the app → **App Information**. Copy the numeric **Apple ID** (digits only, under General Information). That is `ascAppId` for later submit — paste it in chat or put it in `eas.json` when you have it.

You do **not** need screenshots or Privacy Nutrition filled before the first EAS build.

### 2. Build on your Mac (Terminal)

```bash
# Repo root once if needed
git fetch origin
git checkout cursor/mobile-rally-style-fbce
pnpm install

# Then into the Expo app (skip if already there)
cd apps/mobile

# Logged into Expo already. First iOS cloud build:
npx eas-cli@latest build --platform ios --profile preview
```

When EAS prompts:

| Prompt | Answer |
| --- | --- |
| Log in to Apple / Apple ID | Use the Apple ID that owns the Developer account |
| Select team | Your paid Apple Developer team |
| Generate credentials / distribution cert / provisioning | **Yes** — let EAS manage |
| Bundle identifier | Confirm `com.fitnessbattle.app` |
| Push notifications / other extras | Defaults / No unless asked for HealthKit and you know you need a manual capability |

Build runs in Expo’s cloud. When it finishes, open the build URL Expo prints (also under [expo.dev](https://expo.dev) → project → Builds). For **preview**, install via the QR / internal link on a registered device, or use a simulator build later if you switch profile.

### 3. After a green preview build (store path)

```bash
# Still in apps/mobile
npx eas-cli@latest build --platform ios --profile production
```

Submit only after `ascAppId` is set in `eas.json` (or pass it when EAS asks):

```bash
npx eas-cli@latest submit --platform ios --profile production --latest
```

## What to send back in chat

1. Whether the **preview** iOS build succeeded (or paste the full error).
2. The App Store Connect numeric **Apple ID** (`ascAppId`) when you have it — so it can be written into `eas.json`.
3. Nothing else (no passwords, no .p8 keys in chat). EAS stores credentials for you.

## Production env (already in eas.json)

| Variable | Value |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | `https://fitness-battle-one.vercel.app` |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://pxruixccvrykhbjzjqga.supabase.co` (battles, not rankings) |
| `EXPO_PUBLIC_USE_DEMO_DATA` | `false` |

## Android (later)

After Google Play enrollment:

```bash
npx eas-cli@latest build --platform android --profile preview
```

## Optional: Expo Cursor skills

```bash
npx skills@latest add expo/skills --skill '*' --agent cursor
```

Then restart Cursor. Not required for builds.
