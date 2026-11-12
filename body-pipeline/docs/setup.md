# Vitals body pipeline — setup

## Overview

| Stage | Script | Output |
| --- | --- | --- |
| Source meshes | `scripts/generate_humans.py` | `generated/source-models/*.obj` |
| MPFB2 (optional) | `scripts/generate_humans_mpfb2.py` in Blender 4.2+ | `*-mpfb2.obj` |
| Process | `scripts/process_meshes.py` | `generated/meshes/{male,female}.glb` |
| Particles | `scripts/generate_particles.py` | `generated/pointclouds/` |
| Validate | `scripts/validate_assets.py` | `validation-report.json` |
| Sync | `scripts/sync_runtime_assets.sh` | `apps/web/public/bodies/` |

## Dependencies

```bash
python3 -m pip install -r body-pipeline/requirements.txt
```

Blender + [MPFB2](https://github.com/makehumancommunity/mpfb2) is optional. This repo’s default path uses **Anny** (Apache-2.0 runtime over **CC0** MakeHuman core assets).

## One-shot regeneration

```bash
python3 body-pipeline/scripts/generate_humans.py
python3 body-pipeline/scripts/process_meshes.py
python3 body-pipeline/scripts/generate_particles.py
python3 body-pipeline/scripts/validate_assets.py
bash body-pipeline/scripts/sync_runtime_assets.sh
pnpm bodies:verify-sync
```

`apps/web` runs `sync_runtime_assets.sh` automatically before `dev` and `build`. Canonical generated output lives under `body-pipeline/generated/`; `apps/web/public/bodies/` is the synced runtime mirror.

## Interactive demo

```bash
pnpm dev
# Open /ux/vitals-body (design / UX access gate applies)
```
