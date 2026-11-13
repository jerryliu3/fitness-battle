# Vitals particle asset format (`.vbody`)

Binary layout:

| Offset | Type | Description |
| --- | --- | --- |
| 0 | `char[4]` | Magic `VBD1` |
| 4 | `uint32` | Version (`1`) |
| 8 | `uint32` | Particle count |
| 12 | `uint32` | Stride bytes (`28`) |
| 16+ | records | One record per particle |

Each particle record (28 bytes):

| Field | Type |
| --- | --- |
| `position` | `float32 × 3` (meters, Y-up, feet on ground) |
| `normal` | `float32 × 3` (unit; zero for interior cloud samples) |
| `region` | `uint8` (`0` default, `1` cardio, `2` respiratory, `3` movement) |
| `class` | `uint8` (`1` surface, `2` interior) |
| padding | `2` bytes |

Companion `.json` metadata sits beside each `.vbody` file.

Density presets per sex (UI label **Density**; not mesh LOD):

| Preset | Typical surface | Typical interior (cloud only) |
| --- | --- | --- |
| `high` | ~6500 | ~8500 |
| `medium` | ~3200 | ~4800 |
| `low` | ~1400 | ~3000 |

- `outline-{high,medium,low}.vbody` — surface shell
- `cloud-{high,medium,low}.vbody` — surface + interior volume fill

Public URL base: `/bodies/pointclouds/{male|female}/`.
