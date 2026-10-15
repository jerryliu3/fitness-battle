# Overtaek loading wordmark

Product boot splash and design study share the OVERTAKE → OVERTAEK letter choreography. The product splash now renders the shared vector Star Ember from `@fitness-battle/shared/mascot` using the studio **`dash`** clip for body language.

## Product boot splash

On play routes, `PhoneShell` shows `apps/web/src/shell/boot-splash.tsx` while compete state is loading **or** the overtake animation has not finished (`boot-gate.ts`). The animation always runs to completion even if app data is already ready. If the animation finishes first, a spinner appears under the settled OVERTAEK mark until data is ready.

Letter travel still uses `features/overtaek/motion.ts` (pass, E shift, lift, settle). Ember’s deformation, crest, wind and trails come from `sampleEmber("dash", …)` stretched across the same 0→1 progress; clip `x`/`y` are zeroed so the stage host alone carries Ember across the wordmark (same pattern as `/design/mascot`). Background tabs pause until visible. Reduced motion jumps to the finished wordmark and releases the animation gate.

The wordmark font is `--font-overtaek` (Nunito Sans 900) from the root layout. No WebGL mesh is used on the product splash.

## Design study

Open `/design/overtaek` for the earlier WebGL loading study (still useful as a motion reference). `/design/mascot` is the vector Ember studio, including the `dash` clip used by the product splash. The study routes stay unindexed.

## Review

- Initial OVERTAKE and final OVERTAEK spelling, with vector Ember replacing K.
- Dash body language peaks while Ember passes E.
- Boot splash holds until animation completes, then shows a spinner if data is still loading.
- Reduced motion and background-tab pause.
- Typecheck, production build, and focused motion/boot-gate/dash sync tests.
