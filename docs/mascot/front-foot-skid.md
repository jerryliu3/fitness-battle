# Front-foot skid candidate

Review `/design/mascot/skid`. This separate follow-up keeps `/design/mascot/launch` and its quick-stop timing available for comparison. Production callers remain on their existing animation.

`sampleEmberSkid()` preserves the earlier crest-first crouch, jump, and orbit, then changes the landing:

- **Touchdown at 3.29s:** reach the ground before the final seat, with roughly 1.2em still to travel. The accelerating air pass and the grounded slide share their entry velocity.
- **Slide for 432ms:** brace on Ember's left foot (screen right), keep the rear leg light, and lean back slightly. Small changes in travel rate and torso rotation suggest friction without reversing direction or bouncing the supporting sole.
- **Settle after stopping:** keep the host in its final seat while lowering the arm, bringing the rear leg down, and rotating into the held crest-first stance. Return directly to K if requested.

`launchSkid` pins the front sole to a fixed rail in the vector's local ground plane. The body can rotate, compress, and recover around it; the host supplies the forward slide. Dust follows the supporting toe throughout the slide. The airborne rear foot's plume is suppressed. Existing `launchSkid=0` scenes retain their earlier geometry and effects.

The enlarged demo shows a ground-contact guide and finish marker during the landing. The wordmark uses the same clock and rig without this authoring guide. A landing-only replay runs the approach, slide, and recovery, while the full replay retains the complete K → Ember → K sequence. Both respect Reduced Motion and stop when the tab is hidden.

Tests cover forward-only sliding, continuous velocity at touchdown and rest, a constant sole height, the raised rear foot, non-crossing silhouette throughout the weight transfer, exact recovery, and Reduced Motion. Web and native share the same model; native bundle verification is separate from on-device visual review.

Reproduce the animation from the repository root:

```sh
pnpm --filter @fitness-battle/shared exec tsc src/mascot/index.ts --target ES2022 --module commonjs --outDir /private/tmp/ember-skid-model --skipLibCheck
node packages/shared/scripts/export-skid-study.cjs /private/tmp/ember-skid-model/mascot docs/mascot
```

![Front-foot slide and recovery](ember-front-foot-skid.gif)
