"""Shared mesh pose, normalization, and region helpers for the Vitals body pipeline."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Literal

import numpy as np
import trimesh

BodySex = Literal["male", "female"]
UpAxis = Literal["auto", "z_up", "y_up"]

REGION_NONE = 0
REGION_CARDIO = 1
REGION_RESPIRATORY = 2
REGION_MOVEMENT = 3


def bone_label_to_region(label: str) -> int:
    """Map Anny / MakeHuman bone label to vitals highlight region."""
    l = label.lower()
    if any(
        k in l
        for k in (
            "thigh",
            "upperleg",
            "lowerleg",
            "calf",
            "foot",
            "toe",
            "upperarm",
            "lowerarm",
            "hand",
            "finger",
            "clavicle",
        )
    ):
        return REGION_MOVEMENT
    if any(k in l for k in ("spine05", "spine04", "chest", "heart", "sternum")):
        return REGION_CARDIO
    if any(k in l for k in ("spine03", "spine02", "spine01", "spine", "ribs", "breath", "lung")):
        return REGION_RESPIRATORY
    return REGION_NONE


def _default_standing_pose() -> dict[str, tuple[float, float, float]]:
    """Repo defaults (degrees, bone-local). Keep in sync with `DEFAULT_VITALS_POSE` (web)."""
    return {
        "clavicle.L": (0.0, 0.0, 5.0),
        "clavicle.R": (0.0, 0.0, -5.0),
        "shoulder01.L": (0.0, 0.0, 7.0),
        "shoulder01.R": (0.0, 0.0, -7.0),
        # Anny: upperarm01.R mirrors Z, not X (±X on both sides drops L/R to same height).
        "upperarm01.L": (-18.0, 0.0, -76.0),
        "upperarm01.R": (-18.0, 0.0, 76.0),
        "upperarm02.L": (0.0, 0.0, 0.0),
        "upperarm02.R": (0.0, 0.0, 0.0),
        "lowerarm01.L": (0.0, 0.0, 0.0),
        "lowerarm01.R": (0.0, 0.0, 0.0),
        # Thigh roll (Z): slight inward without the Y abduction that splayed the feet.
        "upperleg01.L": (0.0, 0.0, -7.0),
        "upperleg01.R": (0.0, 0.0, 7.0),
    }


def _load_pose_json_overrides() -> dict[str, tuple[float, float, float]]:
    path = Path(__file__).resolve().parents[2] / "local" / "pose.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Invalid pose file: {path}")
    out: dict[str, tuple[float, float, float]] = {}
    for label, rot in data.items():
        if not isinstance(rot, dict):
            continue
        out[str(label)] = (
            float(rot.get("x", 0.0)),
            float(rot.get("y", 0.0)),
            float(rot.get("z", 0.0)),
        )
    return out


def standing_pose_rotvec_deg() -> dict[str, tuple[float, float, float]]:
    """Standing neutral + optional `body-pipeline/local/pose.json` overrides (dev)."""
    pose = _default_standing_pose()
    for label, rot in _load_pose_json_overrides().items():
        if label in pose:
            pose[label] = rot
    return pose


def standing_arm_rotvec_deg() -> dict[str, tuple[float, float, float]]:
    """Deprecated alias for standing_pose_rotvec_deg."""
    return standing_pose_rotvec_deg()


def detect_up_axis(mesh: trimesh.Trimesh) -> UpAxis:
    """Anny exports are Z-up; MPFB2 OBJ exports are already Y-up."""
    ext = mesh.bounds[1] - mesh.bounds[0]
    if ext[2] >= ext[1] and ext[2] >= ext[0]:
        return "z_up"
    if ext[1] >= ext[0] and ext[1] >= ext[2]:
        return "y_up"
    return "z_up"


def normalize_standing(
    mesh: trimesh.Trimesh,
    target_height: float = 1.72,
    *,
    up_axis: UpAxis = "auto",
) -> trimesh.Trimesh:
    """Center on Y axis, feet on Y=0, face -Z (runtime / Three.js convention)."""
    work = mesh.copy()
    work.merge_vertices()
    work.update_faces(work.unique_faces())
    work.remove_unreferenced_vertices()

    resolved = detect_up_axis(work) if up_axis == "auto" else up_axis
    if resolved == "z_up":
        # MakeHuman / Anny rest mesh: Z-up — rotate to Y-up for the renderer.
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
    y0 = bounds[0][1]
    x = points[:, 0]
    y = points[:, 1]
    yn = (y - y0) / height
    lateral = np.abs(x) / half_width

    regions = np.zeros(len(points), dtype=np.uint8)
    movement = (yn < 0.5) & ((lateral > 0.2) | (yn < 0.38))
    cardio = (yn >= 0.54) & (yn <= 0.72) & (lateral < 0.22)
    respiratory = (yn >= 0.46) & (yn <= 0.82) & (lateral < 0.32) & ~cardio
    regions[movement] = REGION_MOVEMENT
    regions[cardio] = REGION_CARDIO
    regions[respiratory & ~cardio] = REGION_RESPIRATORY
    return regions


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
