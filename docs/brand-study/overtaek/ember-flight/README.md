# Star Ember rigid flight

## Racing motion refinement

`race-flight-study.html` builds on the accepted lightweight v1. It adds a cosine acceleration ramp, a fast pass, a separate braking curve, and a damped positional settle. Three short gold wake lines, six faint passing streaks, and a quiet track reference communicate speed. They disappear with velocity so the finished character remains calm.

The flame tip and outer points now have the user-requested soft response. Two damped springs follow squared speed (drag) and acceleration (inertia). The tip lags backward and rebounds on braking; the outer points flex less. Deformation weights exclude the central face region and move the front and back surfaces together. Texture coordinates and base geometry are retained. The spring response is precomputed at a fixed step so scrubbing, replay, and slow motion agree.

This adds only 3,656 bytes of spring samples, nine motion streaks, and a thin track reference. It reuses the same 197,280-byte mesh, original texture, one WebGL program, 24 fps cap, resolution cap, visibility pause, and cleanup behavior. No rendering library or simulation package was added. The optional design controls adjust wind strength, trail visibility, and viewing angle. The accepted rigid v1 remains below.

Verification checked the acceleration/pass/braking frames and complete replay through the stopped state. The motion curve advances monotonically and ends at zero speed, spring values remain finite, the base mesh and texture match v1 exactly, and all 2,406 sampled dark-green face pixels have zero flex weight. The renderer reported the same mesh memory and pixel count as v1, with no browser errors.

## Accepted rigid v1

`light-flight-study.html` isolates the approved character: front view, turn toward the right, flight from left to right, then a stop. No letterform or anatomy morphing is included in this original version.

The original 480 px Star Ember WebP is bundled byte for byte as the front texture. A fixed closed mesh is reconstructed from its alpha silhouette and an approximate padded depth field. The side/back geometry is inferred from the single image; it is not an original authored 3D model. Only whole-body position and rotation change during playback. The face, five points, curved flame tip, mesh vertices, and scale are not independently animated.

## Memory limits

- One native WebGL canvas, one program, one texture, two mesh buffers; no external rendering library.
- 6,366 vertices and 11,660 triangles, precomputed before opening the browser.
- 197,280 bytes of mesh buffers; one 480 × 480 texture (approximately 0.88 MiB when decoded).
- Drawing surface capped at 640 × 360 pixels; device pixel ratio is not multiplied.
- No antialiasing, stencil buffer, preserved drawing buffer, shadow maps, or postprocessing.
- Renders at most 24 fps during playback; no idle render loop and no autoplay.
- Pauses when hidden or outside the viewport; deletes GPU buffers, texture, program, and context when the page is closed.

These are bounds for this preview's resources, not a measurement of total browser or system memory. Older preview tabs were closed during the retry. The earlier Three.js prototype is retained as a source experiment but is not loaded by the lightweight study.

## Sources

`build_reference.py` reads the original artwork's alpha without modifying the texture and records the depth samples in `reference.json`. `build_light_mesh.py` builds the compact mesh into `light-mesh.json`. The inline HTML bundles that mesh and texture and requires no asset requests.

The distance-field generator uses Pillow and NumPy during preparation. They are not runtime dependencies. The mesh generator uses only Python's standard library.

## Verification

The original texture bytes, mesh indices, mirrored front/back coordinates, and finite vertex data were checked. Browser inspection covered the front view, right-facing view, replay, and completed stop. No application or production loading-screen changes are included.
