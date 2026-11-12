#!/usr/bin/env python3
"""Normalize source OBJ meshes and export runtime GLB assets."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.mesh_common import assign_region, normalize_standing, validate_mesh, write_json  # noqa: E402

import numpy as np
import trimesh
from scipy.spatial import cKDTree


def process_one(
    src: Path,
    dst_glb: Path,
    regions_src: Path | None,
    regions_dst: Path,
    target_height: float,
) -> dict[str, object]:
    mesh = trimesh.load(src, force="mesh", process=False)
    if isinstance(mesh, trimesh.Scene):
        mesh = trimesh.util.concatenate(tuple(mesh.geometry.values()))
    pre_verts = mesh.vertices.copy()
    aligned = normalize_standing(mesh, target_height=target_height)
    dst_glb.parent.mkdir(parents=True, exist_ok=True)
    aligned.export(dst_glb)

    if regions_src and regions_src.exists():
        regions = np.fromfile(regions_src, dtype=np.uint8)
        if len(regions) == len(pre_verts):
            _, idx = cKDTree(pre_verts).query(aligned.vertices)
            regions = regions[idx]
        elif len(regions) != len(aligned.vertices):
            regions = assign_region(aligned.vertices, aligned.bounds)
    else:
        regions = assign_region(aligned.vertices, aligned.bounds)
    regions_dst.write_bytes(regions.astype(np.uint8).tobytes())
    report = validate_mesh(aligned)
    report["path"] = str(dst_glb)
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--src-dir",
        type=Path,
        default=ROOT / "body-pipeline" / "generated" / "source-models",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=ROOT / "body-pipeline" / "generated" / "meshes",
    )
    parser.add_argument("--height-male", type=float, default=1.74)
    parser.add_argument("--height-female", type=float, default=1.66)
    args = parser.parse_args()

    reports: dict[str, object] = {}
    for sex, height in (("male", args.height_male), ("female", args.height_female)):
        src = args.src_dir / f"{sex}-standing.obj"
        if not src.exists():
            print(f"Missing {src}; run generate_humans.py first.", file=sys.stderr)
            raise SystemExit(1)
        dst = args.out_dir / f"{sex}.glb"
        regions_src = args.src_dir / f"{sex}-vertex-regions.uint8"
        regions_dst = args.out_dir / f"{sex}-vertex-regions.uint8"
        reports[sex] = process_one(src, dst, regions_src, regions_dst, height)
        print(f"Processed {sex} -> {dst}")

    write_json(args.out_dir / "processing-report.json", reports)
    print("Done.")


if __name__ == "__main__":
    main()
