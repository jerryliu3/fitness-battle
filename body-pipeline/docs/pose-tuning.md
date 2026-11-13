# Standing pose tuning (Anny)

## Why a bad pose shipped once

`standing_pose_rotvec_deg()` stores **degrees in each bone’s local frame**, not world-space Euler angles. A large rotation on `upperarm01` **Y** does not mean “drop the arm”; on Anny it can fold the limb behind the head while automated width/height metrics still looked acceptable.

Before changing pose values or regenerating public `.vbody` assets:

1. Run `python3 body-pipeline/scripts/preview_standing_pose.py` and inspect the PNGs.
2. Change **one bone, one axis, a few degrees** at a time; re-run the preview.
3. Only then run the full `generate_humans.py` → `sync_runtime_assets.sh` chain.

## Safe iteration pattern

- Start from the checked-in defaults in `mesh_common.py`.
- Prefer small adjustments on `upperarm01` **Z** (historically the abduction/down axis) with matching L/R signs.
- Mirror right-side bones explicitly: if `.L` is `(x, y, z)`, `.R` is typically `(-x, y, -z)` for twist bones — verify in the preview each time.
- Fingers and `lowerarm02` inherit the chain; usually leave them at rest unless fixing wrist bend.

## What we cannot do blindly

- Grid-search rotvecs using torso-width heuristics without orthographic previews.
- Assume symmetry fixes without checking **both** male and female phenotypes in the preview script.
