# Standing pose tuning (Anny)

## Why a bad pose shipped once

`standing_pose_rotvec_deg()` stores **degrees in each bone’s local frame**, not world-space Euler angles. A large rotation on `upperarm01` **Y** does not mean “drop the arm”; on Anny it can fold the limb behind the head while automated width/height metrics still looked acceptable.

Before changing pose values or regenerating public `.vbody` assets:

1. Run `python3 body-pipeline/scripts/preview_standing_pose.py` and inspect the PNGs.
2. Change **one bone, one axis, a few degrees** at a time; re-run the preview.
3. Only then run the full `generate_humans.py` → `sync_runtime_assets.sh` chain.

## Localhost sliders (`/ux/vitals-body`)

With `pnpm dev` on localhost and mesh source **Anny**, use **LOCAL ANNY POSE** in the side panel:

1. Adjust per-bone X/Y/Z sliders → **Save pose.json**
2. `python3 body-pipeline/scripts/preview_standing_pose.py`
3. `pnpm bodies:generate && pnpm bodies:sync` → hard-refresh the page

Overrides live in `body-pipeline/local/pose.json` (gitignored). See `local/pose.json.example`.

## Safe iteration pattern

- Start from the checked-in defaults in `mesh_common.py` (or reset in the dev panel).
- Prefer small adjustments on `upperarm01` **Z** (hang) and **X** (lateral plane).
- **Anny `upperarm01`:** use the **same X on `.L` and `.R`**; flip **Z** sign only (e.g. L `(-18,0,-76)` / R `(-18,0,76)`). Mirroring X to `(+18,0,76)` on `.R` drops one arm lower than the other.
- Other bones may still use `(-x, y, -z)` — verify in preview each time.
- Fingers and `lowerarm02` inherit the chain; usually leave them at rest unless fixing wrist bend.

## What we cannot do blindly

- Grid-search rotvecs using torso-width heuristics without orthographic previews.
- Assume symmetry fixes without checking **both** male and female phenotypes in the preview script.
