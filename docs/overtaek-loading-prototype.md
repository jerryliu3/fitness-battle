# Overtaek loading wordmark

Product boot splash and design study share the same choreography: OVERTAKE → OVERTAEK with Star Ember.

## Product boot splash

On play routes, `PhoneShell` shows `apps/web/src/shell/boot-splash.tsx` while compete state is loading **or** the overtake animation has not finished (`boot-gate.ts`). The animation always runs to completion even if app data is already ready. If the animation finishes first, a spinner appears under the settled OVERTAEK mark until data is ready. When the mark settles (or graphics fail), WebGL is torn down and the static Ember image holds the final pose so a later context loss cannot blank the slot. Background tabs pause playback until visible so the overtake is not spent off-screen. Reduced motion, missing WebGL, or asset failure jump to the finished wordmark and release the animation gate.

Motion and WebGL live in `apps/web/src/features/overtaek/` (`motion.ts`, `renderer.ts`). The wordmark font is `--font-overtaek` (Nunito Sans 900) from the root layout.

## Design study

Open `/design/overtaek`. The route wrapper stays in `src/app/design/overtaek/`; the interactive study lives in `src/app/design/_studies/overtaek-lab/`. Next treats `_studies` as a private folder, so that path adds no extra URL. The study adds Play/Pause, replay, slow motion, and a position scrubber on top of the shared engine; it does not change application naming elsewhere.

The initial mark reads OVERTAKE, with approved Star Ember artwork occupying K's slot. Ember turns right, accelerates above E, and settles on E's right as E glides left into the vacated slot. The final mark reads OVERTAEK. The original face stays stable; bounded damped springs add wind lag and a braking rebound in the flame tip and outer points. The accepted face texture is reused from `/brand/mascots/star-ember.webp`.

## Asset and memory limits

`public/brand/overtaek/ember-mesh.bin` is a precomputed closed, padded mesh inferred from the approved artwork's alpha. Its depth/back are approximations, not an original authored 3D model. Header: four little-endian uint32 values (OVTK magic `0x4b54564f`, vertex count, index count, vertex byte length), followed by interleaved float32 XYZ/UV vertices and uint16 indices. Negative U identifies the untextured back surface.

The mesh contains 6,366 vertices / 11,660 triangles in 197,280 bytes of buffers. One canvas, program, original texture, and two buffers are used. Resolution is capped at 640 × 360; animation is capped at 24 fps with no idle render loop. Springs add 3,656 bytes. Visibility changes pause playback. No rendering library or new dependency is added.

Regenerate the asset with `python3 scripts/build-overtaek-mesh.py` (preparation requires Pillow and NumPy). The generator derives the silhouette and padded depth from the existing WebP and writes the binary directly; it does not modify the source artwork.

## Review

- Initial OVERTAKE and final OVERTAEK spelling, with Ember replacing K.
- Boot splash holds until animation completes, then shows a spinner if data is still loading.
- Pass, braking, and rebound at normal speed (and slow motion in the study).
- Narrow layout, resize/font changes, and returning to the page.
- Reduced motion and WebGL/asset failure fallback.
- Typecheck, production build, and focused motion/asset tests.
