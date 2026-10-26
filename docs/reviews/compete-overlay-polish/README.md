# Compete overlays and Crew finish

October 26, 2026.

Offscreen distance labels now measure the unsigned distance between the athlete
and the nearest longitudinal viewport edge. Pan and zoom update the gap. The
capsule center is the boundary: at zero, the arrow disappears and the capsule
returns. Visible athlete nameplates retain their relative-to-you values.

Fullscreen Live intervals and the bottom athlete panel collapse independently
into left-side tabs. A stationary 450 ms hold temporarily hides field overlays;
release or cancellation restores them. Moving more than 8 px or adding a second
finger cancels a pending hold. Releasing a hold does not select an athlete.

Crew finish checks use the progress block's top-plane projection instead of its
front face. Flags stand at both ends. The existing target position and totals
remain unchanged.

## Browser review

Verified the production web Compete route using its local preview roster:
fullscreen expansion, both panels collapsing independently, interval expansion,
return to inline view, and the Crew finish rendering.

![Collapsed panels](collapsed-panels.png)

![Crew top-surface finish](crew-finish.png)

## Validation

- Workspace typecheck.
- 29 shared viewport, perspective, finish-scene and hold tests.
- 11 web gesture, field and Crew tests.
- 7 native field and gesture tests.
- Production web build.

Native behavior was checked by typecheck and automated gesture tests; no physical
iOS or Android device was used in this pass.
