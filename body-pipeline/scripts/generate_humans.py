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
    REGION_NONE,
    assign_region,
    bone_label_to_region,
    standing_pose_rotvec_deg,
    validate_mesh,
    write_json,
)

import numpy as np

import roma
import torch
import trimesh
from anny import Anny

PHENOTYPE_PATH = ROOT / "body-pipeline" / "local" / "phenotype.json"

DEFAULT_PHENOTYPE: dict[str, dict[str, float]] = {
    "male": {
        "age": 0.58,
        "muscle": 0.32,
        "weight": 0.48,
        "height": 0.54,
        "proportions": 0.5,
    },
    "female": {
        "age": 0.58,
        "muscle": 0.28,
        "weight": 0.44,
        "height": 0.5,
        "proportions": 0.52,
    },
}


def load_phenotype_file() -> dict[str, dict[str, float]]:
    if not PHENOTYPE_PATH.exists():
        return {}
    import json

    data = json.loads(PHENOTYPE_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Invalid phenotype file: {PHENOTYPE_PATH}")
    return data


def _phenotype(sex: BodySex) -> dict[str, float]:
    merged = {**DEFAULT_PHENOTYPE[sex]}
    file_cfg = load_phenotype_file()
    if sex in file_cfg and isinstance(file_cfg[sex], dict):
        merged.update(file_cfg[sex])
    merged["gender"] = 0.0 if sex == "male" else 1.0
    return merged


def _pose_rotvec(model: Anny) -> torch.Tensor:
    dtype = torch.float32
    bones_rotvec = torch.zeros((len(model.bone_labels), 3), dtype=dtype)
    arm_map = standing_pose_rotvec_deg()
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

    bone_regions = np.array(
        [bone_label_to_region(l) for l in model.bone_labels], dtype=np.uint8
    )
    v_weights = model.vertex_bone_weights.detach().cpu().numpy()
    v_indices = model.vertex_bone_indices.detach().cpu().numpy()
    if v_weights.ndim == 3:
        v_weights = v_weights[0]
        v_indices = v_indices[0]
    dominant = v_weights.argmax(axis=1)
    bone_idx = v_indices[np.arange(len(vertices)), dominant]
    vertex_regions = bone_regions[bone_idx]
    # Torso / organs: spatial heuristic fills gaps where bone labels lack cardio splits.
    spatial = assign_region(vertices, np.array([vertices.min(0), vertices.max(0)]))
    fill = (vertex_regions == REGION_NONE) & (spatial > 0)
    vertex_regions = vertex_regions.astype(np.uint8)
    vertex_regions[fill] = spatial[fill]
    pre_merge_verts = vertices.copy()

    mesh.merge_vertices()

    source_dir = out_dir / "source-models"
    source_dir.mkdir(parents=True, exist_ok=True)
    obj_path = source_dir / f"{sex}-standing.obj"
    mesh.export(obj_path)
    if len(vertex_regions) != len(mesh.vertices):
        from scipy.spatial import cKDTree

        _, idx = cKDTree(pre_merge_verts).query(mesh.vertices)
        vertex_regions = vertex_regions[idx]

    regions_path = source_dir / f"{sex}-vertex-regions.uint8"
    regions_path.write_bytes(vertex_regions.astype(np.uint8).tobytes())

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
