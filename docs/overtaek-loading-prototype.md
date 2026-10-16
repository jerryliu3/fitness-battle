# Overtaek loading wordmark

Product boot splash and design study share the OVERTAKE → OVERTAEK letter choreography. The product splash renders the shared vector Star Ember from `@fitness-battle/shared/mascot`.

## Product boot splash

Gate + motion live in `@fitness-battle/shared/boot` (`shouldShowBootSplash`, `bootFrame`, `bootEmberPose`, ~3200 ms). The animation **always runs to completion** even when compete data is already ready; if the mark settles first, a spinner waits under OVERTAEK until data is ready.

- **Web:** `PhoneShell` shows `apps/web/src/shell/boot-splash.tsx` on play routes.
- **Mobile (TestFlight / Expo):** `BootGate` in `apps/mobile/app/_layout.tsx` shows `apps/mobile/src/ui/boot-splash.tsx` before the tab stack.

### Beat

1. **Ready** — Ember stands in the K slot and morphs into a vague K (right tip down, left tip up).
2. **Flight** — host path flies left **behind** the letters, loops the **O**, returns **in front**, then overtakes **E**. Body language samples studio `flyForward` for object-consistent lean/trail; the host flips facing when traveling left. Depth drives z-order so letter ink occludes Ember while behind.
3. **Settle** — Ember crossfades into a literal **K** while E finishes sliding into the former slot (OVERTAEK).

Background / inactive app pauses the pass. Reduced motion jumps to the finished OVERTAEK with the K letter.

Wordmark is scaled larger than body UI type (Nunito Sans 900). No WebGL mesh on the product splash.

## Design study

Open `/design/overtaek` for the earlier WebGL loading study (still useful as a motion reference). `/design/mascot` is the vector Ember studio, including `flyForward` / `dash`. The study routes stay unindexed.

## Review

- Initial OVERTAKE and final OVERTAEK spelling, with Ember→K crossfade at settle.
- Flight reads behind → around O → in front → overtake E.
- Boot splash holds until animation completes, then shows a spinner if data is still loading.
- Reduced motion and background-tab / inactive-app pause.
- Typecheck and focused boot gate / flight path tests.
