# Expo / store IDs (Overtaek)

## Use these values in App Store Connect and Play Console

| Field | Value |
| --- | --- |
| Listing name | Overtaek - Compete on Effort |
| Name under the icon | Overtaek |
| **iOS Bundle ID** | `com.overtaek.app` |
| **Android package name** | `com.overtaek.app` |
| SKU | `overtaek-ios` |
| Deep link scheme | `overtaek://` |
| Expo slug | `overtaek` |
| Expo project ID | `bea1932b-6a00-4edc-9710-22350423c446` |

Do **not** register `com.fitnessbattle.app`. Internal monorepo packages may still use `@fitness-battle/*`; that is not store-facing.

## First iOS build (from `apps/mobile`)

```bash
npx eas-cli@latest build --platform ios --profile preview
```

Confirm bundle id `com.overtaek.app` when EAS asks. Paste back the build result and the App Store Connect numeric Apple ID (`ascAppId`) for submit config.
