#!/usr/bin/env python3
"""
Blender batch script — run with MPFB 2.x installed as a Blender extension.

  blender --background --python body-pipeline/scripts/generate_humans_mpfb2.py

Uses HumanService.create_human() macro parameters when MPFB is available.
If MPFB is missing, the script exits with a clear message (use generate_humans.py).

macOS setup (headless-friendly): see body-pipeline/scripts/install_mpfb2.sh
"""

from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path

try:
    import bpy
except ImportError:
    print("This script must run inside Blender.", file=sys.stderr)
    raise SystemExit(1)

ROOT = Path(bpy.path.abspath("//")).parent
if not ROOT.exists():
    ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "body-pipeline" / "generated" / "source-models"
OUT.mkdir(parents=True, exist_ok=True)


def _mpfb_symbol(absolute_package: str, key: str):
    """Resolve MPFB symbols across Blender's extension module paths."""
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
        "male": dict(gender=0.0, age=0.35, muscle=0.15, weight=0.45, height=0.52, proportions=0.5),
        "female": dict(gender=1.0, age=0.35, muscle=0.08, weight=0.4, height=0.48, proportions=0.52),
    }
    macros.update(preset[sex])
    return macros


def export_sex(label: str) -> None:
    HumanService = _mpfb_symbol("mpfb.services.humanservice", "HumanService")
    macros = _macro_detail(label)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()

    obj = HumanService.create_human(
        mask_helpers=False,
        detailed_helpers=False,
        extra_vertex_groups=False,
        feet_on_ground=True,
        macro_detail_dict=macros,
    )
    obj.name = f"vitals_{label}"
    bpy.context.view_layer.objects.active = obj

    obj_path = OUT / f"{label}-standing-mpfb2.obj"
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.wm.obj_export(filepath=str(obj_path), export_selected_objects=True)

    meta = {
        "sex": label,
        "source": "mpfb2",
        "macros": {k: v for k, v in macros.items() if isinstance(v, (int, float, str))},
        "blender_version": bpy.app.version_string,
        "vertex_count": len(obj.data.vertices),
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
