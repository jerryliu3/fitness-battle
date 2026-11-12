#!/usr/bin/env python3
"""Validate generated meshes and particle assets."""

from __future__ import annotations

import argparse
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.mesh_common import write_json  # noqa: E402

import numpy as np
import trimesh

MAGIC = b"VBD1"
STRIDE = 28


def read_vbody(path: Path) -> np.ndarray:
    raw = path.read_bytes()
    magic, version, count, stride = struct.unpack_from("<4sIII", raw, 0)
    assert magic == MAGIC and stride == STRIDE
    positions = []
    offset = 16
    for _ in range(count):
        x, y, z, nx, ny, nz, region, klass = struct.unpack_from("<3f3fBB2x", raw, offset)
        positions.append((x, y, z, region, klass))
        offset += stride
    return np.asarray(positions, dtype=np.float32)


def validate_mesh(path: Path) -> dict[str, object]:
    mesh = trimesh.load(path, force="mesh")
    if isinstance(mesh, trimesh.Scene):
        mesh = trimesh.util.concatenate(tuple(mesh.geometry.values()))
    foot = mesh.bounds[0][1]
    center_x = (mesh.bounds[0][0] + mesh.bounds[1][0]) / 2
    return {
        "path": str(path),
        "vertices": len(mesh.vertices),
        "watertight": bool(mesh.is_watertight),
        "feet_on_ground": bool(abs(foot) < 0.02),
        "centered_x": bool(abs(center_x) < 0.05),
        "height_m": float(mesh.bounds[1][1] - mesh.bounds[0][1]),
    }


def validate_particles(path: Path) -> dict[str, object]:
    pts = read_vbody(path)
    regions = pts[:, 3]
    classes = pts[:, 4]
    return {
        "path": str(path),
        "count": len(pts),
        "y_min": float(pts[:, 1].min()),
        "y_max": float(pts[:, 1].max()),
        "interior_fraction": float((classes == 2).mean()),
        "region_counts": {
            "cardio": int((regions == 1).sum()),
            "respiratory": int((regions == 2).sum()),
            "movement": int((regions == 3).sum()),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--root",
        type=Path,
        default=ROOT / "body-pipeline" / "generated",
    )
    args = parser.parse_args()

    report: dict[str, object] = {"meshes": {}, "particles": {}}
    for sex in ("male", "female"):
        glb = args.root / "meshes" / f"{sex}.glb"
        if glb.exists():
            report["meshes"][sex] = validate_mesh(glb)  # type: ignore[index]
        for mode in ("outline", "cloud"):
            vbody = args.root / "pointclouds" / sex / f"{mode}-high.vbody"
            if vbody.exists():
                key = f"{sex}/{mode}"
                report["particles"][key] = validate_particles(vbody)  # type: ignore[index]

    out = args.root / "validation-report.json"
    write_json(out, report)
    print(out.read_text())
    failed = any(
        not m.get("feet_on_ground") or not m.get("centered_x")  # type: ignore[union-attr]
        for m in report.get("meshes", {}).values()  # type: ignore[union-attr]
    )
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
