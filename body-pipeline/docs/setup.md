# Vitals body pipeline — setup

## Overview

| Stage | Script | Output |
| --- | --- | --- |
| Source meshes | `scripts/generate_humans.py` | `generated/source-models/*.obj` |
| MPFB2 (optional) | `scripts/generate_humans_mpfb2.py` in Blender 4.2+ | `*-mpfb2.obj` |
| Process | `scripts/process_meshes.py` | `generated/meshes/{male,female}.glb` |
| Particles | `scripts/generate_particles.py` | `generated/pointclouds/` |
| Validate | `scripts/validate_assets.py` | `validation-report.json` |
| Sync | `scripts/sync_runtime_assets.sh [anny\|mpfb2]` | `apps/web/public/bodies/<variant>/` |

## Dependencies

```bash
python3 -m venv body-pipeline/.venv
body-pipeline/.venv/bin/pip install -r body-pipeline/requirements.txt
# thereafter: body-pipeline/.venv/bin/python body-pipeline/scripts/…
```

Blender + [MPFB2](https://github.com/makehumancommunity/mpfb2) is optional. This repo’s default path uses **Anny** (Apache-2.0 runtime over **CC0** MakeHuman core assets).

### MPFB2 on macOS (local regeneration)

Blender’s extension storefront needs **Allow Online Access** in Preferences; the install script instead builds the official `v2.0.18` sources and installs offline:

```bash
chmod +x body-pipeline/scripts/install_mpfb2.sh
bash body-pipeline/scripts/install_mpfb2.sh

blender --background --python body-pipeline/scripts/generate_humans_mpfb2.py
body-pipeline/.venv/bin/python body-pipeline/scripts/process_meshes.py --source-suffix=-mpfb2
body-pipeline/.venv/bin/python body-pipeline/scripts/generate_particles.py
body-pipeline/.venv/bin/python body-pipeline/scripts/validate_assets.py
pnpm bodies:sync:mpfb2
```

Or `pnpm bodies:generate:mpfb2` after MPFB2 is installed.

MPFB exports use a MakeHuman rest pose (not the Anny arm-abduction pose). Visual diffs vs Anny are expected until rigged posing is added.

MPFB OBJ/GLB meshes are usually **not watertight**; `generate_particles.py` uses a shell-offset interior fallback instead of `mesh.contains()` so the pipeline does not hang.

## One-shot regeneration

```bash
python3 body-pipeline/scripts/generate_humans.py
python3 body-pipeline/scripts/process_meshes.py
python3 body-pipeline/scripts/generate_particles.py
python3 body-pipeline/scripts/validate_assets.py
bash body-pipeline/scripts/sync_runtime_assets.sh anny
pnpm bodies:verify-sync
```

`apps/web` runs `sync_runtime_assets.sh anny` automatically before `dev` and `build` (updates the Anny bundle only). Canonical output lives under `body-pipeline/generated/`.

### Compare Anny vs MPFB in the demo

The `/ux/vitals-body` control panel has a **MESH** toggle (`Parametric` = Anny, `MPFB` = Blender). Each option loads `/bodies/anny/` or `/bodies/mpfb2/`.

Ship both folders once (or after regenerating a variant):

```bash
pnpm bodies:bootstrap-variants
pnpm bodies:generate:mpfb2 && pnpm bodies:sync:mpfb2
```

## Interactive demo

```bash
pnpm dev
# Open /ux/vitals-body (design / UX access gate applies)
```
