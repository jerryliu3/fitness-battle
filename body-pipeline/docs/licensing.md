# Licensing & provenance

## MakeHuman core mesh data (CC0-1.0)

- **What**: Base human topology and authored targets used by MakeHuman / Anny.
- **License**: [CC0 1.0](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md)
- **Commercial use**: Permitted without attribution.
- **Bundled in app**: **Exported meshes and particle positions only** (derived geometry), not MakeHuman application source.

## Anny Python package (generation-time only)

- **Package**: `anny` 0.6.x ([Apache-2.0](https://github.com/naver/anny))
- **Role**: Offline parametric mesh generation in `generate_humans.py`.
- **Runtime**: **Not** shipped inside the web or mobile bundles.

## MPFB2 / Blender (optional)

- **MPFB2**: GPL-3.0 application add-on — use only as an offline authoring tool.
- **Blender export**: Prefer glTF/OBJ export of CC0 geometry; do not embed GPL source in runtime.

## Generated assets in this repository

| Asset | Source | License |
| --- | --- | --- |
| `generated/source-models/*.obj` | Anny → MakeHuman CC0 | CC0 (geometry) |
| `generated/meshes/*.glb` | Processed derived mesh | CC0 (geometry) |
| `generated/pointclouds/*.vbody` | Sampled from CC0 mesh | CC0 (derived) |

Record regeneration date and `anny` version in each `*-standing.meta.json`.
