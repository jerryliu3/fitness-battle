# Onboarding replay refinements

The native keyboard reveal compares the measured field bottom with the keyboard
in window coordinates, retaining the observed scroll offset and a 12-point gap.
It checks settled keyboard frames, keeps native keyboard insets, and never
re-centers the same input after a manual drag. Visible inputs stay put.

On the overtake step, the onboarding foreground is drawing-only. Its retained
athlete card and caption cannot intercept the replay's bottom controls. The
caption has content-driven height and ten-point padding. Supported native builds
use ultra-thin system material; older builds show a translucent tint instead of
an opaque card. The native material refinement requires a new binary.

Onboarding replay defaults are in `ONBOARDING_REPLAY_TUNING`: eight seconds,
slowdown weight 6 instead of 18, and an extra 0.6 zoom levels near the pass.
The slowdown still centers on the crossing, with the same final positions and
pass count. Ordinary competition replays retain their existing presentation.

## Adjustable code preview

The unlinked `/replay-tuning?preview=1` route uses the actual native replay and
camera. Duration, slowdown and camera controls restart the scene for comparison.
It never commits activities, scores, receipts or onboarding completion.

From `/Users/jerryliu/.codex/worktrees/226c/fitness-battle`:

```sh
pnpm --filter @fitness-battle/mobile ios --port 8082
```

After launch, open the preview in the simulator:

```sh
xcrun simctl openurl booted 'overtaek://replay-tuning?preview=1'
```

Use 13s / Original / Wide to compare the former pacing. Then try 8s / Balanced /
Close and 6.5s / Light / Closer. Respect the device's Reduced Motion preference.
Device review is still required for keyboard positioning, native tap routing and
material appearance; renderer tests cannot establish those visual results.
