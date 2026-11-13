# Standing pose tuning (Anny)

Use `/ux/vitals-body` on localhost with Parametric selected. Run `pnpm bodies:venv`
once to install Python dependencies. The stage loads the real Anny mesh, skeleton,
reference frames and skin weights; both react to sliders immediately. The first
load or a saved phenotype change exports a fresh model through the development API.

Choose **Soldier · arms at sides** for straight arms close to the torso with palms
inward. Existing pipeline defaults and zero reference rotations remain available.
Pink is anatomical left and blue is right. Focus a slider to mark its pivot yellow.
Upperarm01/02 and lowerarm01/02 subdivide their respective limbs; they are not
separate full-length arms. The mesh can be hidden to inspect the skeleton.

Values are axis-angle rotation-vector components in degrees using Anny's
**local-ref** parameterization. Native coordinates are Z-up; X crosses the body
and Y is front/back. Ancestors carry the reference axes. A vector's length is its
rotation angle and direction its axis; these are not independent Euler angles.
Mirror symmetry across X negates the Y/Z rotation-vector components, retaining X.
Do not assume a slider axis means the same anatomical movement for every joint.

**Save pose.json** writes `body-pipeline/local/pose.json` (gitignored). For an
independent Python front/side preview with the saved pose and phenotype, run:

```sh
body-pipeline/.venv/bin/python3 body-pipeline/scripts/preview_standing_pose.py
```

Inspect both male/female PNGs under `body-pipeline/generated/`, then bake:

```sh
source body-pipeline/.venv/bin/activate
pnpm bodies:generate && pnpm bodies:sync
```

Hard-refresh to see updated point clouds. Live mesh tuning does not change baked
assets or pipeline defaults until explicitly saved and regenerated. The Soldier
preset is checked for the standard male/female phenotypes, not a collision solver
for every custom body shape. See `docs/reviews/anny-pose-rig.md` for the mapping
review and independent Python/browser parity tests.
