# Overtaek loading wordmark

Product boot splash and design study share the OVERTAKE → OVERTAEK letter choreography. The product splash now renders the shared vector Star Ember from `@fitness-battle/shared/mascot` using the studio **`dash`** clip for body language.

## Product boot splash

Gate + motion live in `@fitness-battle/shared/boot` (`shouldShowBootSplash`, `bootFrame`, `bootEmberPose`, ~1600 ms). The animation **always runs to completion** even when compete data is already ready; if the mark settles first, a spinner waits under OVERTAEK until data is ready.

- **Web:** `PhoneShell` shows `apps/web/src/shell/boot-splash.tsx` on play routes.
- **Mobile (TestFlight / Expo):** `BootGate` in `apps/mobile/app/_layout.tsx` shows `apps/mobile/src/ui/boot-splash.tsx` before the tab stack. Local AsyncStorage hydrate is usually instant — without this gate the app would skip straight to Today.

Beat: long ready while Ember morphs from standing rest into a vague K (right tip down, left tip up), then a short sharp letter jump, then settle with the upper arm still raised. Host travel carries Ember; dash clip only adds light body language during the jump. Background / inactive app pauses the pass. Reduced motion jumps to the finished K wordmark.

Wordmark is scaled larger than body UI type (Nunito Sans 900). Undecided experiment: fade Ember into a literal `K` at settle — not shipped.

No WebGL mesh on the product splash.

## Design study

Open `/design/overtaek` for the earlier WebGL loading study (still useful as a motion reference). `/design/mascot` is the vector Ember studio, including the `dash` clip used by the product splash. The study routes stay unindexed.

## Review

- Initial OVERTAKE and final OVERTAEK spelling, with vector Ember replacing K.
- Dash body language peaks while Ember passes E.
- Boot splash holds until animation completes, then shows a spinner if data is still loading.
- Reduced motion and background-tab pause.
- Typecheck, production build, and focused motion/boot-gate/dash sync tests.
