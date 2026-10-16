# Front-foot skid candidate

Review `/design/mascot/skid`. This separate follow-up keeps `/design/mascot/launch` and its quick-stop timing available for comparison. Production callers remain on their existing animation.

`sampleEmberSkid()` uses the crest-first crouch and orbit with a lower, shorter hop. Backward flight starts earlier, and the landing has three connected beats:

- **Touchdown at 3.29s:** reach the ground before the final seat, with roughly 1.2em still to travel. The accelerating air pass and the grounded slide share their entry velocity.
- **Slide for 432ms:** brace on Ember's left foot (screen right), keep the rear leg light, and lean back slightly. Small changes in travel rate and torso rotation suggest friction without reversing direction or bouncing the supporting sole.
- **Turn directly into K after stopping:** recovery and morph start together at 3.72s and finish at 4.46s. The arm lowers and the body rotates while the limbs become the K; there is no intermediate standing hold. Uncheck “Rotate into K” to inspect the upright Ember endpoint instead.

`launchSkid` pins the front sole to a fixed rail in the vector's local ground plane. The body can rotate, compress, and recover around it; the host supplies the forward slide. A separate deterministic emitter continually throws fresh grains and light puffs backward from the supporting toe for the full slide, then lets the last grains disperse. Its ground anchor stays fixed during the final morph. The airborne rear foot does not emit dust. Existing `launchSkid=0` scenes retain their earlier geometry and effects.

E stays still until Ember reaches its original position during the skid. Its movement follows Ember’s horizontal pass rather than an early timer. A shared 0.14em spacing correction shifts both E’s final seat and K’s final seat, opening a small visible A–E gap while preserving E–K spacing.

The enlarged demo shows a ground-contact guide and finish marker during the landing. The wordmark uses the same clock and rig without this authoring guide. A landing-only replay runs the approach, slide, and combined turn-to-K finish, while the full replay retains the complete K → Ember → K sequence. Both respect Reduced Motion and stop when the tab is hidden.

Tests cover forward-only sliding, continuous velocity at touchdown and rest, a constant sole height, the raised rear foot, non-crossing silhouette throughout the weight transfer, exact recovery, simultaneous turn/morph, later E movement, spacing, sustained spray, and Reduced Motion. Web and native share the same model; native bundle verification is separate from on-device visual review.

Reproduce the animation from the repository root:

```sh
pnpm --filter @fitness-battle/shared exec tsc src/mascot/index.ts --target ES2022 --module commonjs --outDir /private/tmp/ember-skid-model --skipLibCheck
node packages/shared/scripts/export-skid-study.cjs /private/tmp/ember-skid-model/mascot docs/mascot
```

![Front-foot slide and recovery](ember-front-foot-skid.gif)
