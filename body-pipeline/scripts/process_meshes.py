#!/usr/bin/env python3
"""Normalize source OBJ meshes and export runtime GLB assets."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.mesh_common import UpAxis, normalize_standing, validate_mesh, write_json  # noqa: E402

import trimesh


def process_one(
    src: Path,
    dst_glb: Path,
    target_height: float,
    up_axis: UpAxis,
) -> dict[str, object]:
    mesh = trimesh.load(src, force="mesh", process=False)
    if isinstance(mesh, trimesh.Scene):
        mesh = trimesh.util.concatenate(tuple(mesh.geometry.values()))
    aligned = normalize_standing(mesh, target_height=target_height, up_axis=up_axis)
    dst_glb.parent.mkdir(parents=True, exist_ok=True)
    aligned.export(dst_glb)
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
    parser.add_argument(
        "--source-suffix",
        default="",
        help='Filename suffix before .obj (e.g. "-mpfb2" for MPFB exports).',
    )
    parser.add_argument(
        "--up-axis",
        choices=("auto", "z_up", "y_up"),
        default="auto",
        help="Source mesh up axis (MPFB Blender exports are y_up; Anny is z_up).",
    )
    args = parser.parse_args()

    up_axis: UpAxis = args.up_axis
    if up_axis == "auto" and args.source_suffix == "-mpfb2":
        up_axis = "y_up"

    reports: dict[str, object] = {}
    for sex, height in (("male", args.height_male), ("female", args.height_female)):
        src = args.src_dir / f"{sex}-standing{args.source_suffix}.obj"
        if not src.exists():
            print(f"Missing {src}; run generate_humans.py first.", file=sys.stderr)
            raise SystemExit(1)
        dst = args.out_dir / f"{sex}.glb"
        reports[sex] = process_one(src, dst, height, up_axis)
        print(f"Processed {sex} -> {dst}")

    write_json(args.out_dir / "processing-report.json", reports)
    print("Done.")


if __name__ == "__main__":
    main()
