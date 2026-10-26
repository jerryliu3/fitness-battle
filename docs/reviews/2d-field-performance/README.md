# 2D field performance

The original 2D field published React state at about 30 Hz for decorative echoes,
rebuilding the field and capsules while idle. Replay additionally rebuilt sampled
per-athlete ribbons and a full-field head-clear mask. Web markers could restart a
480 ms easing animation on each replay frame. Pan/pinch published every input event.
The selected 3D field is a simpler SVG scene with no idle React clock.

## Final implementation

- Remove the long earned-distance ribbons and their field-wide mask. Scenery now
  depends on camera, geometry and appearance, not athlete values.
- Keep the original capsule paths, masks, colors, echo count, fade, clipping and
  gold/platinum cycle durations (1.15/1.32 seconds). Inline/reduced-motion stays still.
- Web animates the existing echo groups with CSS and reuses the capsule's existing
  SVG definitions. Intersection/visibility changes pause animation outside React.
- Native animates the existing SVG groups with Reanimated animated props. One
  field-level lifecycle owns two UI-thread phases, shared by all capsules. Original
  transforms, clipping and paint order remain in one scene. There are no overlay
  SVGs, duplicate positions, per-capsule lifecycle subscriptions or React frame ticks.
- Batch input to one pending frame; web replay supplies marker transforms directly.

Native SVG painting still occurs during animation. Moving animation off React
removes JS reconciliation work; it does **not** prove native paint is inexpensive.
A separate surface should only be considered if physical-device profiling shows
SVG painting remains the bottleneck.

## Evidence and limits

Tests compare still rendering against the original RGBA output, animation poses
against `polishedEchoPose`, and camera updates against stable running animation.
They check lifecycle cleanup, reduced motion, scenery reuse and gesture batching.
Browser walkthroughs covered fullscreen, replay through 4×, stepping and follow.
These establish functional behavior, not end-to-end smoothness on a phone.

`node scripts/benchmark-2d-field.cjs 07899d65` compares pure scenery construction
for 12 athletes in a moving 390 × 750, 1.2 km window. The initial 2,000-frame run
measured trail CPU 14,375 → 716 ms and oval 22,447 → 31 ms. The script defaults to
400 frames. Those timings exclude React, SVG paint, wake animation and compositing;
they must not be reported as a device-FPS speedup.

The first PR revision used separate native wake SVG overlays. Audit removed them:
they duplicated positioning and painted above existing field labels. Preserving
one rendering path is the simpler starting point until paint profiling justifies
additional surfaces. The web revision also removes duplicated capsule definitions.

![Original wake artwork](original-wakes-web.png)
