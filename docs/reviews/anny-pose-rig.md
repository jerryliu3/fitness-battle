# Anny pose lab review (#635)

The old stick rig could not represent the mesh. It used a fabricated hierarchy,
segment directions and lengths, omitted lowerarm02, and rendered upperarm01/02
as two whole limbs. Rotating only the visual capsule did not establish a joint
bind frame. These errors persisted even with the correct axis-angle conversion.

The pipeline also described `Anny()` values as bone-local. [Anny’s documented
pose conventions](https://github.com/naver/anny#technical-details) default to
`local-ref`, with native Z-up coordinates and reference orientations distinct
from phenotype rest orientations. A world-Y stick figure cannot consume those
values directly. The live rig now exports all 104 bones, parent indices, reference
local transforms, reference orientations, phenotype rest matrices, mesh topology,
and all skin influences (nine per vertex here). Both the skeleton and mesh use
Anny's local-ref forward kinematics and linear blend skinning; the same fixed
Z-up → Y-up transform is applied to both. The Python generation and preview scripts
explicitly pin `rig="anny"`, `pose_parameterization="local-ref"`, and LBS.

The lab shows the real mesh and rig together, with an optional mesh toggle and a
yellow marker at the selected slider's pivot. Native X/Y/Z remain the slider
coordinate system; rotation vectors are not independent Euler angles. Camera
orbit/zoom does not alter pose or refit on slider changes. Front/Side/Back and
zoom choices also drive the live camera. Toggle Live pose mesh + rig off to
return to the baked scan and its particle controls. Every input updates
both displays. Changing sex reloads its phenotype; saving phenotype reloads the
live model. Save pose.json remains the only pose persistence action.

The previous PNG API wrote pose.json before waiting on a global preview process,
so overlapping requests could render a different pose or overwrite an explicit
save. It also served shared mutable PNG paths. This path is removed in favor of
the instant live mesh; the standalone Python preview remains an independent check
and now reads the same phenotype configuration as generation. The previous panel
also reloaded pose.json when sex/auto-preview dependencies changed, losing edits.
Pose loading now depends only on whether the Anny panel is active.

Three presets replace the ten unverified guesses: **Soldier · relaxed arms**
(now the shipped pipeline default), **legacy pipeline (pre-Soldier)**, and
**zero reference** identity deltas. Soldier was fitted using the actual
shoulder/elbow/wrist positions and palm plane, then inspected from front and side
on male and female meshes. It resets all tunable bones, keeps straight arms close
to the torso and palms inward. This is a pose preset, not collision-aware IK for
arbitrary body shapes.

Parity tests use independently generated Anny/PyTorch expectations for both sexes:
identity, shipped defaults (`_default_standing_pose()`), every slider axis separately,
and combined multi-axis rotations across ancestors. They compare every skeleton pivot
and surface samples chosen from strongest bone influences, within 0.02 mm in display
space. Separate soldier assertions check arm alignment and clearance. After changing
defaults, regenerate fixtures and baked point clouds:

```sh
body-pipeline/.venv/bin/python3 body-pipeline/scripts/generate_pose_rig_fixtures.py
pnpm bodies:generate && pnpm bodies:sync
```

(Older fixtures used legacy −76° arm defaults in the second pose slot; regen is
required once Soldier becomes `_default_standing_pose()`.)

Run locally from `/Users/jerryliu/.codex/worktrees/bca0/fitness-battle`:

```sh
pnpm install
pnpm bodies:venv
pnpm dev:web
```

Open http://localhost:3000/ux/vitals-body, choose Parametric (Soldier is the default).
Drag the mesh to orbit; scroll to zoom. Tune a slider
and verify its yellow pivot and both displays. Toggle Show live mesh to inspect
the skeleton alone. Save pose.json, activate `body-pipeline/.venv`, then run
`pnpm bodies:generate && pnpm bodies:sync`
to update the point cloud. Retain your existing local environment; if offline auth
is needed, copy `.env.demo` to `.env.local` only after preserving your configuration.

Targeted verification:

```sh
pnpm --filter @fitness-battle/web test src/lib/vitals-pose-rig-layout.test.ts src/lib/vitals-pose-arm-presets.test.ts src/app/api/dev/vitals-pose/route.test.ts src/app/api/dev/vitals-pose/rig/route.test.ts
```

Verification completed: 14 targeted tests passed, web TypeScript check passed,
and the browser was exercised with slider changes, male/female switching and
Front/Side views. The Soldier preview is in `anny-soldier-preview.jpg`.
Regenerate `anny-pose-rig.json` and run `pnpm bodies:generate && pnpm bodies:sync` on
a machine with `pnpm bodies:venv` before merge so baked `.vbody` point clouds match
Soldier defaults.

Follow-up: corrected the directed palm-plane target (the original preset had the
palms reversed). The relaxed Soldier preset now rotates the arm chain into the
opposite palm orientation, adds outward arm clearance, and applies symmetric
3.3-degree thigh rotations to bring each foot inward about 5 cm (half a grid
square). Palm orientation now has a regression assertion for both body shapes.
The eight rig/preset tests pass. Browser reconnection was unavailable for this
follow-up; front/side Python mesh previews were inspected for both body shapes.
