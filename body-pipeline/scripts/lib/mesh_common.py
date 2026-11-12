"""Shared mesh pose, normalization, and region helpers for the Vitals body pipeline."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import numpy as np
import trimesh

BodySex = Literal["male", "female"]
SystemId = Literal["full", "cardiovascular", "respiratory", "movement"]

SYSTEM_NAMES: dict[SystemId, str] = {
    "full": "Full body",
    "cardiovascular": "Cardiovascular",
    "respiratory": "Respiratory",
    "movement": "Movement",
}

REGION_NONE = 0
REGION_CARDIO = 1
REGION_RESPIRATORY = 2
REGION_MOVEMENT = 3


@dataclass(frozen=True)
class AlignedBody:
    mesh: trimesh.Trimesh
    sex: BodySex
    height_m: float
    bounds: np.ndarray


def standing_arm_rotvec_deg() -> dict[str, float]:
    """Small arm abduction so hands clear the torso (degrees, bone-local axes)."""
    return {
        "upperarm01.L": (18.0, 8.0, 6.0),
        "upperarm01.R": (-18.0, -8.0, -6.0),
        "lowerarm01.L": (6.0, 0.0, 0.0),
        "lowerarm01.R": (-6.0, 0.0, 0.0),
    }


def normalize_standing(mesh: trimesh.Trimesh, target_height: float = 1.72) -> trimesh.Trimesh:
    """Center on Y axis, feet on Y=0, face -Z (MakeHuman / Blender convention)."""
    work = mesh.copy()
    work.merge_vertices()
    work.update_faces(work.unique_faces())
    work.remove_unreferenced_vertices()

    # MakeHuman rest orientation: Y up; front roughly +Y facing — rotate to face camera (-Z).
    rot = trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0])
    work.apply_transform(rot)

    bounds = work.bounds
    foot = bounds[0][1]
    work.apply_translation([0.0, -foot, 0.0])
    center_x = (bounds[0][0] + bounds[1][0]) / 2
    center_z = (bounds[0][2] + bounds[1][2]) / 2
    work.apply_translation([-center_x, 0.0, -center_z])

    height = work.bounds[1][1] - work.bounds[0][1]
    if height > 1e-6:
        scale = target_height / height
        work.apply_scale(scale)

    return work


def validate_mesh(mesh: trimesh.Trimesh) -> dict[str, object]:
    return {
        "vertices": int(len(mesh.vertices)),
        "faces": int(len(mesh.faces)),
        "watertight": bool(mesh.is_watertight),
        "euler_number": int(mesh.euler_number),
        "degenerate_faces": int((mesh.area_faces == 0).sum()),
        "bounds_min": mesh.bounds[0].tolist(),
        "bounds_max": mesh.bounds[1].tolist(),
    }


def assign_region(points: np.ndarray, bounds: np.ndarray) -> np.ndarray:
    """Heuristic region ids from normalized body-space coordinates."""
    height = max(bounds[1][1] - bounds[0][1], 1e-6)
    half_width = max((bounds[1][0] - bounds[0][0]) / 2, 1e-6)

    regions = np.zeros(len(points), dtype=np.uint8)
    for i, (x, y, z) in enumerate(points):
        yn = (y - bounds[0][1]) / height
        lateral = abs(x) / half_width
        depth = abs(z) / max(bounds[1][2] - bounds[0][2], 1e-6)

        if yn < 0.5 and (lateral > 0.2 or yn < 0.38):
            regions[i] = REGION_MOVEMENT
        elif 0.58 <= yn <= 0.68 and lateral < 0.16:
            regions[i] = REGION_CARDIO
        elif 0.5 <= yn <= 0.78 and lateral < 0.26:
            regions[i] = REGION_RESPIRATORY
        else:
            regions[i] = REGION_NONE
    return regions


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
