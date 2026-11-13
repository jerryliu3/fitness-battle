#!/usr/bin/env python3
"""
Blender batch script — run with MPFB 2.x installed as a Blender extension.

  blender --background --python body-pipeline/scripts/generate_humans_mpfb2.py

Exports posed, gendered basemeshes without helper geometry (Anny-like A-pose).
"""

from __future__ import annotations

import importlib
import json
import math
import sys
from pathlib import Path

try:
    import bpy
    from mathutils import Euler
except ImportError:
    print("This script must run inside Blender.", file=sys.stderr)
    raise SystemExit(1)

ROOT = Path(bpy.path.abspath("//")).parent
if not ROOT.exists():
    ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "body-pipeline" / "generated" / "source-models"
OUT.mkdir(parents=True, exist_ok=True)

# Bone-local degrees, aligned with body-pipeline/scripts/lib/mesh_common.py
STANDING_POSE_DEG: dict[str, tuple[float, float, float]] = {
    "clavicle.L": (0.0, 0.0, 5.0),
    "clavicle.R": (0.0, 0.0, -5.0),
    "shoulder01.L": (0.0, 0.0, 7.0),
    "shoulder01.R": (0.0, 0.0, -7.0),
    "upperarm01.L": (18.0, 0.0, -72.0),
    "upperarm01.R": (-18.0, 0.0, 72.0),
    "upperarm02.L": (4.0, 0.0, 0.0),
    "upperarm02.R": (-4.0, 0.0, 0.0),
    "lowerarm01.L": (6.0, 0.0, 0.0),
    "lowerarm01.R": (-6.0, 0.0, 0.0),
    "upperleg01.L": (0.0, 0.0, -7.0),
    "upperleg01.R": (0.0, 0.0, 7.0),
}


def _mpfb_symbol(absolute_package: str, key: str):
    for module_name in sys.modules:
        if module_name.endswith(absolute_package):
            mod = importlib.import_module(module_name)
            if not hasattr(mod, key):
                raise AttributeError(f"Module {module_name} missing {key}")
            return getattr(mod, key)
    raise ImportError(
        f"MPFB symbol {key} not found ({absolute_package}). "
        "Install the extension: body-pipeline/scripts/install_mpfb2.sh"
    )


def _has_mpfb() -> bool:
    try:
        _mpfb_symbol("mpfb.services.humanservice", "HumanService")
        return True
    except Exception:
        return False


def _macro_detail(sex: str) -> dict:
    TargetService = _mpfb_symbol("mpfb.services.targetservice", "TargetService")
    macros = TargetService.get_default_macro_info_dict()
    preset = {
        "male": dict(
            gender=0.0,
            age=0.55,
            muscle=0.38,
            weight=0.46,
            height=0.54,
            proportions=0.48,
            cupsize=0.0,
            firmness=0.35,
        ),
        "female": dict(
            gender=1.0,
            age=0.55,
            muscle=0.22,
            weight=0.44,
            height=0.5,
            proportions=0.52,
            cupsize=0.42,
            firmness=0.48,
        ),
    }
    macros.update(preset[sex])
    macros["race"] = {"caucasian": 1.0, "asian": 0.0, "african": 0.0}
    return macros


def _apply_phenotype(obj, macros: dict) -> None:
    HumanObjectProperties = _mpfb_symbol("mpfb.entities.objectproperties", "HumanObjectProperties")
    TargetService = _mpfb_symbol("mpfb.services.targetservice", "TargetService")
    for key in (
        "gender",
        "age",
        "muscle",
        "weight",
        "proportions",
        "height",
        "cupsize",
        "firmness",
    ):
        HumanObjectProperties.set_value(key, float(macros[key]), entity_reference=obj)
    for race_key, race_val in macros["race"].items():
        HumanObjectProperties.set_value(race_key, float(race_val), entity_reference=obj)
    TargetService.reapply_macro_details(obj)


def _apply_standing_pose(armature: bpy.types.Object) -> None:
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="POSE")
    for bone_name, (rx, ry, rz) in STANDING_POSE_DEG.items():
        pb = armature.pose.bones.get(bone_name)
        if pb is None:
            continue
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = Euler(
            (math.radians(rx), math.radians(ry), math.radians(rz))
        )
    bpy.ops.object.mode_set(mode="OBJECT")


def _strip_shape_keys(basemesh: bpy.types.Object) -> None:
    if not basemesh.data.shape_keys:
        return
    bpy.context.view_layer.objects.active = basemesh
    bpy.ops.object.select_all(action="DESELECT")
    basemesh.select_set(True)
    while basemesh.data.shape_keys and basemesh.data.shape_keys.key_blocks:
        bpy.ops.object.shape_key_remove(all=True)


def _bake_rig_to_mesh(basemesh: bpy.types.Object, armature: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    basemesh.select_set(True)
    bpy.context.view_layer.objects.active = basemesh
    _strip_shape_keys(basemesh)
    for mod in list(basemesh.modifiers):
        if mod.type in {"ARMATURE", "MASK"}:
            bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(armature, do_unlink=True)


def _only_basemesh(obj: bpy.types.Object) -> None:
    for other in list(bpy.data.objects):
        if other != obj and other.type == "MESH":
            bpy.data.objects.remove(other, do_unlink=True)


def export_sex(label: str) -> None:
    HumanService = _mpfb_symbol("mpfb.services.humanservice", "HumanService")
    macros = _macro_detail(label)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()

    basemesh = HumanService.create_human(
        mask_helpers=True,
        detailed_helpers=False,
        extra_vertex_groups=False,
        feet_on_ground=True,
        macro_detail_dict=macros,
    )
    _apply_phenotype(basemesh, macros)
    basemesh.name = f"vitals_{label}"

    armature = HumanService.add_builtin_rig(basemesh, "default", import_weights=True)
    if armature is None:
        raise RuntimeError("MPFB2 default rig failed to load")

    _apply_standing_pose(armature)
    _bake_rig_to_mesh(basemesh, armature)
    _only_basemesh(basemesh)

    bpy.context.view_layer.objects.active = basemesh
    obj_path = OUT / f"{label}-standing-mpfb2.obj"
    bpy.ops.object.select_all(action="DESELECT")
    basemesh.select_set(True)
    bpy.ops.wm.obj_export(filepath=str(obj_path), export_selected_objects=True)

    meta = {
        "sex": label,
        "source": "mpfb2",
        "macros": {k: v for k, v in macros.items() if k != "race"},
        "race": macros["race"],
        "blender_version": bpy.app.version_string,
        "vertex_count": len(basemesh.data.vertices),
        "pose": "standing_fk",
    }
    (OUT / f"{label}-standing-mpfb2.meta.json").write_text(
        json.dumps(meta, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Exported {obj_path} ({meta['vertex_count']} verts)")


def main() -> None:
    if not _has_mpfb():
        print(
            "MPFB not found. Install via:\n"
            "  bash body-pipeline/scripts/install_mpfb2.sh\n"
            "or use:\n"
            "  python3 body-pipeline/scripts/generate_humans.py",
            file=sys.stderr,
        )
        raise SystemExit(2)

    for label in ("male", "female"):
        export_sex(label)
    print("MPFB2 export complete.")


if __name__ == "__main__":
    main()
