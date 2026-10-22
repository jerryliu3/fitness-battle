# Native simulator build verification

The redesign's first local iOS build exposed two pre-existing dependency/toolchain failures. Both are repaired through pnpm's locked patch mechanism, without new dependencies or version upgrades.

1. `react-native-health@1.19.0` replaced the React Native event emitter's framework-wired invoker with an unwired singleton and called the removed `setBridge:` selector. Remove those two lines and the now-unused singleton. `RCTEventEmitter` continues delivering the existing events; HealthKit permission and read behavior are unchanged. This follows the [upstream RN 0.86 compatibility report](https://github.com/agencyenterprise/react-native-health/issues/443) and matches the installed React Native emitter implementation.
2. `expo-modules-jsi@57.1.2` failed inside its nested Xcode invocation. Remove `-quiet` from that invocation so it emits normal compiler output. No compiler errors are suppressed and no binary is substituted. This is the narrow [documented Xcode build-script workaround](https://github.com/expo/expo/issues/50279), retained until the SDK 57 dependency can be upgraded deliberately.

Apply automatically with `pnpm install --frozen-lockfile`; patch hashes and paths are in the lockfile. Regenerate ignored native projects with Expo's existing workflow. These patches should be removed when an upstream-compatible dependency upgrade is adopted and verified.

## Verified locally

- `expo run:ios --device ED483E93-2E40-4926-9828-A8BC4B640774 --port 8082`: native build succeeds, 0 compiler errors and 0 compiler warnings.
- Installs and launches `com.overtaek.app` on iPhone 17 Pro / iOS 26.5.
- iOS Hermes bundle compiles (2,662 modules).
- Home and Crew render with the new shared tokens, illustration, mascot and safe-area navigation.
- Native Progress exposes Overview/Effort/History, Week/Month/Year and achievements. Tapping Previous week changes Oct 19–25 to Oct 12–18 and enables Next week.
- Screenshots captured through Device Hub are `ios-home.jpg`, `ios-progress.jpg`, `ios-crew.jpg` in this folder. Expo web captures remain separately labeled.

Simulator checks use an empty guest account. No HealthKit permission was requested, no real activity was read, and no production account write was performed. Android hardware, live tracker data, production OAuth and device haptics remain their normal release checks.
