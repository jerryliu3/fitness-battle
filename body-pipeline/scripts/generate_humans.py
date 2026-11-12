#!/usr/bin/env python3
"""
Generate generic male/female MakeHuman-based body meshes.

Primary path (this environment): Anny parametric model (Apache-2.0 runtime over CC0
MakeHuman core assets). Optional path: Blender + MPFB2 via generate_humans_mpfb2.py.

Usage:
  python3 body-pipeline/scripts/generate_humans.py
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.mesh_common import (  # noqa: E402
    BodySex,
    standing_arm_rotvec_deg,
    validate_mesh,
    write_json,
)

import roma
import torch
import trimesh
from anny import Anny


def _phenotype(sex: BodySex) -> dict[str, float]:
    gender = 0.0 if sex == "male" else 1.0
    return {
        "gender": gender,
        "age": 0.58,
        "muscle": 0.32,
        "weight": 0.48 if sex == "male" else 0.44,
        "height": 0.54 if sex == "male" else 0.5,
        "proportions": 0.5,
    }


def _pose_rotvec(model: Anny) -> torch.Tensor:
    dtype = torch.float32
    bones_rotvec = torch.zeros((len(model.bone_labels), 3), dtype=dtype)
    arm_map = standing_arm_rotvec_deg()
    for index, label in enumerate(model.bone_labels):
        if label in arm_map:
            bones_rotvec[index] = torch.tensor(arm_map[label], dtype=dtype)
    return bones_rotvec


def export_body(model: Anny, sex: BodySex, out_dir: Path) -> Path:
    dtype = torch.float32
    bones_rotvec = _pose_rotvec(model)
    bones_rotmat = roma.rotvec_to_rotmat(torch.deg2rad(bones_rotvec))
    pose = roma.Rigid(
        bones_rotmat, torch.zeros((len(bones_rotmat), 3), dtype=dtype)
    )[None].to_homogeneous()

    phenotype_kwargs = _phenotype(sex)
    output = model(pose_parameters=pose, phenotype_kwargs=phenotype_kwargs)
    vertices = output["vertices"].squeeze(0).detach().cpu().numpy()
    faces = model.faces.cpu().numpy()

    mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)
    mesh.merge_vertices()

    source_dir = out_dir / "source-models"
    source_dir.mkdir(parents=True, exist_ok=True)
    obj_path = source_dir / f"{sex}-standing.obj"
    mesh.export(obj_path)

    meta = {
        "sex": sex,
        "source": "anny",
        "anny_version": "0.6.x",
        "asset_license": "CC0-1.0 (MakeHuman core mesh data via Anny)",
        "runtime_license": "Apache-2.0 (Anny Python package only; not bundled in app)",
        "phenotype": phenotype_kwargs,
        "validation": validate_mesh(mesh),
    }
    write_json(source_dir / f"{sex}-standing.meta.json", meta)
    print(f"Wrote {obj_path} ({len(mesh.vertices)} verts)")
    return obj_path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--out",
        type=Path,
        default=ROOT / "body-pipeline" / "generated",
    )
    args = parser.parse_args()

    print("Loading Anny full-body model (MakeHuman CC0 assets)…")
    model = Anny(local_changes="default")
    model = model.to(dtype=torch.float32)

    for sex in ("male", "female"):
        export_body(model, sex, args.out)  # type: ignore[arg-type]

    readme = args.out / "source-models" / "README.md"
    readme.write_text(
        "# Source human meshes\n\n"
        "Generated with [Anny](https://github.com/naver/anny) 0.6.x using CC0 MakeHuman\n"
        "core assets. For Blender + MPFB2 export, see `generate_humans_mpfb2.py`.\n",
        encoding="utf-8",
    )
    print("Done.")


if __name__ == "__main__":
    main()
