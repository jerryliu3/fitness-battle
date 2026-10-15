# Overtaek loading-wordmark prototype

Open `/design/overtaek`. The route wrapper stays in `src/app/design/overtaek/`; the study lives in `src/app/design/_studies/overtaek-lab/`. Next treats `_studies` as a private folder, so that path adds no extra URL. This is an isolated, unindexed prototype with Play/Pause, replay, slow motion, and a position scrubber. It does not replace app startup or change the application name elsewhere.

The initial mark reads OVERTAKE, with approved Star Ember artwork occupying K's slot. Ember turns right, accelerates above E, and settles on E's right as E glides left into the vacated slot. The final mark reads OVERTAEK. The original face stays stable; bounded damped springs add wind lag and a braking rebound in the flame tip and outer points. The accepted face texture is reused from `/brand/mascots/star-ember.webp`.

`_studies/overtaek-lab/motion.ts` contains the deterministic motion and spring response. `renderer.ts` owns the native WebGL resources. The React component measures the real letter boxes after fonts load and on resize, and converts those positions into the 3D scene. It aborts pending asset loads and releases resources on unmount, including React development remounts.

## Asset and memory limits

`public/brand/overtaek/ember-mesh.bin` is a precomputed closed, padded mesh inferred from the approved artwork's alpha. Its depth/back are approximations, not an original authored 3D model. Header: four little-endian uint32 values (OVTK magic `0x4b54564f`, vertex count, index count, vertex byte length), followed by interleaved float32 XYZ/UV vertices and uint16 indices. Negative U identifies the untextured back surface.

The mesh contains 6,366 vertices / 11,660 triangles in 197,280 bytes of buffers. One canvas, program, original texture, and two buffers are used. Resolution is capped at 640 × 360; animation is capped at 24 fps with no idle render loop. Springs add 3,656 bytes. Visibility changes pause playback. No rendering library or new dependency is added.

Regenerate the asset with `python3 scripts/build-overtaek-mesh.py` (preparation requires Pillow and NumPy). The generator derives the silhouette and padded depth from the existing WebP and writes the binary directly; it does not modify the source artwork.

Reduced-motion users get the finished wordmark without fetching the mesh or allocating WebGL. Unavailable WebGL, failed assets, or graphics-context loss also produce a static final wordmark. The prototype never blocks navigation.

## Review

- Initial OVERTAKE and final OVERTAEK spelling, with Ember replacing K.
- Pass, braking, and rebound at normal speed and slow motion.
- Narrow layout, resize/font changes, and returning to the page.
- Reduced motion and WebGL/asset failure fallback.
- Typecheck, production build, and focused motion/asset tests.

Verified: `pnpm typecheck`, `pnpm build:web`, and five focused Vitest tests passed. Asset regeneration matched byte for byte. Browser checks covered the initial mark, overtaking frame, final mark, complete replay, 320 px layout, and navigation away/back without console errors. The build used one temporary build worker and a bounded Node heap to limit preparation memory; repository build configuration is unchanged. Native reduced-motion and graphics-context-loss paths were not manually triggered in the browser.
