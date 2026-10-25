# Issue 8 — native iOS control scope and rollout

Production changes use the installed Expo Router 58 and existing native picker;
no new native dependency or imitation Glass layer is introduced.

| Common surface | Production behavior |
| --- | --- |
| Shared ScreenHeader | iOS native Stack header and SF Symbol Back toolbar item; system Glass on iOS 26+, system material on older iOS. Measured native header clearance avoids overlaying content. |
| Athlete local panels | Same native toolbar, original callback; disable native route-pop gestures while Back closes an in-place panel. |
| Short choices (≤10) | Existing iOS ActionSheetIOS; cancellation is explicitly guarded. |
| Long choices | Native Picker wheel, selected draft, explicit Done/Cancel. Android/web retain virtualized lists. |
| Duration/distance | Existing native number wheels. |
| Date/time | Existing platform DateTimePicker. |
| Main iOS tabs | Existing NativeTabs. |

The shared header reaches Athlete/settings, Notifications, Your week, Members,
achievements, history and component review. Header colors do not set an opaque
background or custom header view, so Expo's system appearance stays available.
The transparent header reserves native measured height minus the SafeArea inset
already supplied by callers. Back uses a native toolbar item to preserve existing
callback/fallback behavior, rather than overriding it with unconditional route pop.

Remaining scope: the Back controls inside full-screen React Native Modals
(route replay/expanded field), onboarding's bespoke flow and the not-found page
remain custom. A system navigation header inside those overlays would require
moving them to native route/form-sheet destinations, with separate parent-state,
dismissal and transition work. No CSS blur is claimed to be native Liquid Glass.
Web keeps Radix dialogs and browser-native form fields; iOS controls are not
substituted into the Next app.

Verified with native typecheck, mobile tests and iOS Metro export. Tests cover the
native toolbar callback/clearance, local panel gesture guard, Android fallback,
action-sheet cancellation and wheel confirmation. Device visual, safe-area and
VoiceOver checks on iOS 18/26 remain outstanding; native appearance follows the
OS and binary's linked SDK. No deployment/binary submission was performed.

References: [Expo Stack](https://docs.expo.dev/router/advanced/stack/),
[Expo native toolbars](https://docs.expo.dev/router/advanced/stack-toolbar/).
