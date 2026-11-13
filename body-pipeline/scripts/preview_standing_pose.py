#!/usr/bin/env python3
"""Orthographic mesh previews for `standing_pose_rotvec_deg()` — required before pose tweaks.

Anny rotation vectors use native reference axes (local-ref); numeric heuristics alone are unreliable. Run:

  python3 body-pipeline/scripts/preview_standing_pose.py

Output: `body-pipeline/generated/pose-preview-{male,female}.png` (front + side).
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))

import matplotlib.pyplot as plt
import numpy as np
import roma
import torch
import trimesh
from anny import Anny

from lib.mesh_common import normalize_standing, standing_pose_rotvec_deg
from generate_humans import _phenotype

OUT_DIR = ROOT / "body-pipeline" / "generated"


def mesh_for_gender(model: Anny, gender: float) -> trimesh.Trimesh:
    labels = list(model.bone_labels)
    pose_map = standing_pose_rotvec_deg()
    rv = torch.zeros((len(labels), 3), dtype=torch.float32)
    for i, label in enumerate(labels):
        if label in pose_map:
            rv[i] = torch.tensor(pose_map[label], dtype=torch.float32)
    pose = roma.Rigid(roma.rotvec_to_rotmat(torch.deg2rad(rv)), torch.zeros((len(rv), 3)))[
        None
    ].to_homogeneous()
    kwargs = _phenotype("female" if gender > 0.5 else "male")
    verts = model(pose_parameters=pose, phenotype_kwargs=kwargs)["vertices"].squeeze(0)
    verts = verts.detach().cpu().numpy()
    return normalize_standing(
        trimesh.Trimesh(vertices=verts, faces=model.faces.cpu().numpy(), process=False),
        1.74,
    )


def save_preview(mesh: trimesh.Trimesh, out: Path, title: str) -> None:
    v = mesh.vertices
    fig, axes = plt.subplots(1, 2, figsize=(8, 10))
    for ax, (xs, ys, lbl) in zip(
        axes,
        [(v[:, 0], v[:, 1], "front (X vs Y)"), (v[:, 2], v[:, 1], "side (Z vs Y)")],
        strict=True,
    ):
        ax.scatter(xs, ys, s=0.08, c="0.35", alpha=0.55)
        ax.set_aspect("equal")
        ax.set_title(lbl)
        ax.set_xlabel("m")
        ax.set_ylabel("Y (m)")
    fig.suptitle(title)
    fig.tight_layout()
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, dpi=160)
    plt.close(fig)
    print(f"Wrote {out}")


def main() -> None:
    model = Anny(local_changes="default", rig="anny", pose_parameterization="local-ref", skinning_method="lbs").to(dtype=torch.float32)
    save_preview(mesh_for_gender(model, 1.0), OUT_DIR / "pose-preview-female.png", "female")
    save_preview(mesh_for_gender(model, 0.0), OUT_DIR / "pose-preview-male.png", "male")


if __name__ == "__main__":
    main()
