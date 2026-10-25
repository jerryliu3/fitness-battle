# Overtaek loading wordmark

## Current product loader — October 24

Web and mobile now default to the **over / taek staggered race** from the motion
playground: 35% clean vertical overlap, three-letter horizontal overlap, three
continuous lead changes, and stepped afterimages. It uses the existing product
ink, paper and tennis tokens. The 5.4-second choreography and SVG coordinates
live in `packages/shared/src/boot/logo-race.ts`; the design playground imports
the same motion rather than maintaining a second copy.

Both production loaders remain in each platform’s UI folder. `BootSplash` accepts
`variant="logo-race"` (default) or `variant="ember"`. The preserved Ember loader
is exported as `EmberBootSplash`; its original CSS and mascot study remain intact.
Use `/design/loading` to switch between and replay both actual web loaders.
Native can select either through the same `variant` prop without another package
or build-time environment flag.

Both obey reduced motion and pause their clocks in the background. The word race
settles immediately for reduced motion and holds its final mark with a loading
indicator while the application finishes. Completion fires once and does not
bypass the application-readiness gate from issue 1. The native animation fallback
deadline remains eight seconds.

The previous loader and original study are documented below.


The preserved Ember boot splash and design study share the OVERTAKE → OVERTAEK letter choreography. The product splash renders the shared vector Star Ember from `@fitness-battle/shared/mascot`.

## Preserved Ember boot splash

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
