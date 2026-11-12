#!/usr/bin/env python3
"""Build outline (surface) and cloud (volumetric) particle assets from processed GLB meshes."""

from __future__ import annotations

import argparse
import struct
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.mesh_common import (  # noqa: E402
    REGION_CARDIO,
    REGION_MOVEMENT,
    REGION_NONE,
    REGION_RESPIRATORY,
    assign_region,
    write_json,
)

import numpy as np
import trimesh
from scipy.spatial import cKDTree

MAGIC = b"VBD1"
CLASS_SURFACE = 1
CLASS_INTERIOR = 2

# bytes per particle: pos(3f) normal(3f) region(u8) class(u8) pad(2) = 28
STRIDE = 28


@dataclass
class QualityPreset:
    surface: int
    interior: int
    poisson_min: float


# Quality = particle density. Counts were shifted down: old medium → high, old low → medium, new sparse low.
PRESETS: dict[str, QualityPreset] = {
    "high": QualityPreset(surface=6500, interior=8500, poisson_min=0.005),
    "medium": QualityPreset(surface=3200, interior=4800, poisson_min=0.0063),
    "low": QualityPreset(surface=1400, interior=3000, poisson_min=0.0088),
}


def poisson_surface(
    mesh: trimesh.Trimesh,
    count: int,
    rng: np.random.Generator,
    min_dist: float,
) -> tuple[np.ndarray, np.ndarray]:
    """Greedy Poisson-disk filter on uniform surface samples."""
    oversample = max(count * 5, 20000)
    pts, face_idx = trimesh.sample.sample_surface(mesh, oversample)
    normals = mesh.face_normals[face_idx]

    # Boost extremities: extra weighted samples for hands/feet (lower Y or high |x| at mid height)
    bounds = mesh.bounds
    height = bounds[1][1] - bounds[0][1]
    yn = (pts[:, 1] - bounds[0][1]) / max(height, 1e-6)
    lateral = np.abs(pts[:, 0]) / max((bounds[1][0] - bounds[0][0]) / 2, 1e-6)
    boost_mask = (yn < 0.08) | ((yn < 0.48) & (lateral > 0.62))
    if boost_mask.any():
        boost_pts, boost_idx = trimesh.sample.sample_surface(mesh, oversample // 3)
        # Keep only boosted extremity samples
        byn = (boost_pts[:, 1] - bounds[0][1]) / max(height, 1e-6)
        blat = np.abs(boost_pts[:, 0]) / max((bounds[1][0] - bounds[0][0]) / 2, 1e-6)
        keep = (byn < 0.08) | ((byn < 0.55) & (blat > 0.55))
        pts = np.vstack([pts, boost_pts[keep]])
        normals = np.vstack([normals, mesh.face_normals[boost_idx[keep]]])

    order = rng.permutation(len(pts))
    pts = pts[order]
    normals = normals[order]

    selected_pts: list[np.ndarray] = []
    selected_n: list[np.ndarray] = []
    min_dist_sq = min_dist * min_dist
    grid: dict[tuple[int, int, int], list[int]] = {}
    cell = min_dist

    def cell_key(p: np.ndarray) -> tuple[int, int, int]:
        return (int(p[0] // cell), int(p[1] // cell), int(p[2] // cell))

    for p, n in zip(pts, normals):
        if len(selected_pts) >= count:
            break
        key = cell_key(p)
        ok = True
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    for idx in grid.get((key[0] + dx, key[1] + dy, key[2] + dz), []):
                        if np.sum((selected_pts[idx] - p) ** 2) < min_dist_sq:
                            ok = False
                            break
                    if not ok:
                        break
        if not ok:
            continue
        idx = len(selected_pts)
        selected_pts.append(p)
        selected_n.append(n)
        grid.setdefault(key, []).append(idx)

    if len(selected_pts) < count:
        need = count - len(selected_pts)
        extra_pts, extra_idx = trimesh.sample.sample_surface(mesh, max(need * 4, 2000))
        extra_n = mesh.face_normals[extra_idx]
        min_dist_sq = min_dist * min_dist
        for p, n in zip(extra_pts, extra_n):
            if len(selected_pts) >= count:
                break
            if all(np.sum((np.asarray(sp) - p) ** 2) >= min_dist_sq for sp in selected_pts):
                selected_pts.append(p)
                selected_n.append(n)

    return np.asarray(selected_pts, dtype=np.float32), np.asarray(selected_n, dtype=np.float32)


def load_vertex_regions(mesh: trimesh.Trimesh, mesh_dir: Path, sex: str) -> np.ndarray:
    path = mesh_dir / f"{sex}-vertex-regions.uint8"
    if path.exists():
        regions = np.fromfile(path, dtype=np.uint8)
        if len(regions) == len(mesh.vertices):
            return regions
    return assign_region(mesh.vertices, mesh.bounds)


def regions_for_points(
    mesh: trimesh.Trimesh, points: np.ndarray, vertex_regions: np.ndarray
) -> np.ndarray:
    """Vitals highlight regions in body space (Y-up, feet on ground)."""
    del vertex_regions  # bone labels kept for mesh export; particles use spatial bands
    return assign_region(points, mesh.bounds)


def interior_normals(mesh: trimesh.Trimesh, points: np.ndarray) -> np.ndarray:
    _, _, face_idx = trimesh.proximity.closest_point(mesh, points)
    normals = mesh.face_normals[face_idx]
    lengths = np.linalg.norm(normals, axis=1, keepdims=True)
    lengths = np.maximum(lengths, 1e-6)
    return (normals / lengths).astype(np.float32)


def sample_interior(
    mesh: trimesh.Trimesh, count: int, rng: np.random.Generator
) -> np.ndarray:
    bounds = mesh.bounds
    pts: list[np.ndarray] = []
    batch = 8000
    attempts = 0
    while len(pts) < count and attempts < 200:
        candidates = rng.uniform(bounds[0], bounds[1], size=(batch, 3))
        inside = mesh.contains(candidates)
        pts.extend(candidates[inside])
        attempts += 1
    if len(pts) < count:
        print(
            f"Warning: only {len(pts)} interior samples (wanted {count}); mesh watertight={mesh.is_watertight}",
            file=sys.stderr,
        )
    arr = np.asarray(pts[:count], dtype=np.float32)
    if len(arr) < count and len(arr) > 0:
        pad = rng.choice(len(arr), size=count - len(arr))
        arr = np.vstack([arr, arr[pad]])
    return arr


def pack_particles(
    positions: np.ndarray,
    normals: np.ndarray,
    regions: np.ndarray,
    classes: np.ndarray,
) -> bytes:
    buf = bytearray()
    for i in range(len(positions)):
        p = positions[i]
        n = normals[i]
        buf.extend(struct.pack("<3f3fBB2x", *p, *n, int(regions[i]), int(classes[i])))
    return bytes(buf)


def write_vbody(
    path: Path,
    positions: np.ndarray,
    normals: np.ndarray,
    regions: np.ndarray,
    classes: np.ndarray,
    meta: dict[str, object],
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = pack_particles(positions, normals, regions, classes)
    header = struct.pack(
        "<4sIII",
        MAGIC,
        1,
        len(positions),
        STRIDE,
    )
    path.write_bytes(header + payload)
    write_json(path.with_suffix(".json"), meta)


def build_for_mesh(glb: Path, out_dir: Path, seed: int) -> None:
    mesh = trimesh.load(glb, force="mesh")
    if isinstance(mesh, trimesh.Scene):
        mesh = trimesh.util.concatenate(tuple(mesh.geometry.values()))
    sex = glb.stem
    mesh_dir = glb.parent
    vertex_regions = load_vertex_regions(mesh, mesh_dir, sex)

    outline_dir = out_dir / sex
    outline_dir.mkdir(parents=True, exist_ok=True)

    for qi, (label, preset) in enumerate(PRESETS.items()):
        rng = np.random.default_rng(seed + qi)
        surf_pos, surf_n = poisson_surface(mesh, preset.surface, rng, preset.poisson_min)
        surf_regions = regions_for_points(mesh, surf_pos, vertex_regions)
        surf_class = np.full(len(surf_pos), CLASS_SURFACE, dtype=np.uint8)

        int_pos = sample_interior(mesh, preset.interior, rng)
        int_n = interior_normals(mesh, int_pos) if len(int_pos) else np.zeros_like(int_pos)
        int_regions = (
            regions_for_points(mesh, int_pos, vertex_regions)
            if len(int_pos)
            else np.array([], dtype=np.uint8)
        )
        int_class = np.full(len(int_pos), CLASS_INTERIOR, dtype=np.uint8)

        write_vbody(
            outline_dir / f"outline-{label}.vbody",
            surf_pos,
            surf_n,
            surf_regions,
            surf_class,
            {
                "sex": sex,
                "mode": "outline",
                "quality": label,
                "density": {"surface": len(surf_pos), "interior_target": preset.interior},
                "seed": seed + qi,
                "stride_bytes": STRIDE,
            },
        )

        if len(int_pos):
            c_pos = np.vstack([surf_pos, int_pos])
            c_n = np.vstack([surf_n, int_n])
            c_r = np.concatenate([surf_regions, int_regions])
            c_c = np.concatenate([surf_class, int_class])
        else:
            c_pos, c_n, c_r, c_c = surf_pos, surf_n, surf_regions, surf_class

        write_vbody(
            outline_dir / f"cloud-{label}.vbody",
            c_pos,
            c_n,
            c_r,
            c_c,
            {
                "sex": sex,
                "mode": "cloud",
                "quality": label,
                "density": {
                    "surface": len(surf_pos),
                    "interior": len(int_pos),
                },
                "seed": seed + qi,
                "stride_bytes": STRIDE,
            },
        )

        print(
            f"Particles {sex} {label}: outline={len(surf_pos)} "
            f"cloud={len(c_pos)} (interior {len(int_pos)})",
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mesh-dir",
        type=Path,
        default=ROOT / "body-pipeline" / "generated" / "meshes",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=ROOT / "body-pipeline" / "generated" / "pointclouds",
    )
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    for sex in ("male", "female"):
        glb = args.mesh_dir / f"{sex}.glb"
        if not glb.exists():
            print(f"Missing {glb}", file=sys.stderr)
            raise SystemExit(1)
        build_for_mesh(glb, args.out_dir, args.seed + (0 if sex == "male" else 1))

    schema = {
        "magic": "VBD1",
        "version": 1,
        "stride_bytes": STRIDE,
        "fields": ["position.xyz", "normal.xyz", "region_u8", "class_u8"],
        "class_surface": CLASS_SURFACE,
        "class_interior": CLASS_INTERIOR,
        "regions": {
            "0": "default",
            "1": "cardiovascular",
            "2": "respiratory",
            "3": "movement",
        },
    }
    write_json(args.out_dir / "schema.json", schema)
    print("Done.")


if __name__ == "__main__":
    main()
