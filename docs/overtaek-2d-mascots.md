# Overtaek: reference-based 2D Ember

Open `/design/overtaek/2d`, linked from `/design/overtaek`. This isolated, unindexed study replaces the earlier three shaded concept explorations with one character based on the supplied front/turnaround and flying pose sheets. It does not alter production startup or the accepted 3D prototype.

## Character

`mascot.tsx` draws an editable SVG character. `rig.ts` contains the traced front silhouette and pose deformation. The ordinary left/right and lower points mirror around x=160 in a 320 × 360 view box; only the top crest is asymmetric. The body has one flat gold fill. Tiny dark-green oval eyes, eye catchlights, a quiet smile, and an open flying/celebration mouth follow the references. The orange edge/extrusion in the supplied images is omitted to retain the requested flat treatment. No source images are shipped in the application.

The pose library shows front, approximately 45° turn, flying, braking and finish. It uses the same rig as the animation; there is no separate set of illustration assets. These are code interpretations of the reference poses, rather than raster cutouts.

## Motion

The existing deterministic `overtaek-lab/motion.ts` timeline still controls acceleration, distance, overtaking, braking and damped wind response. The four ordinary points have separate local deformation fields around their own attached roots. They sweep backward or lift at different rates, while the torso and face stay stable. The crest bends under wind and rebounds under braking. One connected Bezier outline prevents gaps between body parts.

The roughly 45° orientation uses mild horizontal foreshortening, a small face displacement and a slightly narrower far eye. The points remain recognizable throughout the turn. At rest, the silhouette returns exactly to its original shape. A brief arm lift celebrates the finish.

The initial view is a character close-up. Wordmark mode retains the OVERTAKE → OVERTAEK pass: Ember flies above E, E slides into K's old slot, and Ember settles to its right. Both modes include play/pause, replay, slow motion and deterministic scrubbing.

## Runtime and review

Only one SVG scene animates, capped at 30 updates per second. No idle render loop, WebGL, meshes, gradients, filters, raster animation assets or new dependencies are used. Hidden/offscreen playback pauses, unmount releases observers/listeners, reduced motion shows the finished pose, and font/resize events remeasure letter positions. No global product tokens change.

Focused rig tests cover balanced front points, independent movement with a fixed torso, bounded finite geometry throughout the timeline, and drift-free return to the original shape when scrubbing. The existing five motion/asset tests also apply.

Verified with monorepo typecheck, production web build, eight focused tests, and browser review of close-up flight, slow motion, wordmark playback to the finished OVERTAEK order, and a 320 px phone layout with no horizontal overflow. No browser warnings/errors were observed. Native reduced-motion preference changes were not manually exercised. Build preparation uses one temporary worker and a 1.5 GB Node heap cap; repository build configuration is unchanged.
