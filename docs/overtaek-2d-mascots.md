# Overtaek: fully 2D Ember prototypes

Open `/design/overtaek/2d`, also linked from the original `/design/overtaek` prototype. This is an isolated, unindexed design study. Production startup and the accepted 3D animation are unchanged.

Three native SVG characters are available:

- **Cel Ember:** closest to the original gold Ember, with a curved flame crest and two solid shading planes. Recommended starting point for continuity and small-size clarity.
- **Puff Ember:** rounder points, warmer orange, cheeks and a more open smile.
- **Bolt Ember:** swept points, lime body, a dark outline and a graphic highlight, using the product's athletic color direction.

All three retain five connected points and a face. `mascot.tsx` owns their editable contours, palette, clipped shadows and facial features. There are no raster assets, meshes, render libraries, SVG filters or new dependencies. The original artwork remains available in the existing prototype.

## Animation

`prototype.tsx` reuses the accepted deterministic `features/overtaek/motion.ts` timeline: preparation, acceleration, pass, braking and spring settle. OVERTAKE becomes OVERTAEK as Ember passes above E and E moves into the former K slot. The mascot starts facing front, turns using horizontal foreshortening and face displacement, then returns to front at rest. This is a 2D pose illusion rather than 3D rotation.

The crest bends backward under acceleration and rebounds during braking. Smaller deformation affects the outer points; the connected body contour and its clipping path always deform together. The face is independent of the wind deformation. All variants use the same movement and controls so their design can be compared fairly.

Wordmark and character close-up views include play/pause, replay, slow motion and scrubbing. Switching concept or view resets playback. Only the selected scene animates, capped at 30 updates per second. No animation runs while idle; leaving the viewport, hiding the document or unmounting stops playback. Reduced motion displays the finished pose and disables playback/scrubbing. Resize and font loading remeasure the letter positions.

The study lives under `apps/web/src/app/design/_studies/ember-2d/`; the route wrapper is `apps/web/src/app/design/overtaek/2d/page.tsx`. Colors are local concept explorations; no global product tokens change.

## Verification

`pnpm typecheck`, `pnpm build:web`, and the five shared motion/asset Vitest tests passed. Build preparation used one temporary worker and a 1.5 GB Node heap limit; the repository build configuration is unchanged. Browser review covered all three concepts, completed playback, slow motion, scrubbing to the passing pose, close-up, 320 px layout with no horizontal overflow, and navigation to the original prototype and back. No browser warnings or errors were observed. Native reduced-motion preference changes were not manually exercised.
