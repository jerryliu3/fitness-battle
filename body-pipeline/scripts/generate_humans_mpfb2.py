#!/usr/bin/env python3
"""
Blender batch script — run inside Blender 4.2+ with MPFB2 installed.

  blender --background --python body-pipeline/scripts/generate_humans_mpfb2.py

Uses HumanService.create_human() macro parameters when MPFB2 is available.
If MPFB2 is missing, the script exits with a clear message (use generate_humans.py).
"""

from __future__ import annotations

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


def _has_mpfb2() -> bool:
    try:
        from mpfb2.services.humanservice import HumanService  # type: ignore

        return True
    except Exception:
        return False


MACROS = {
    "male": dict(gender=0.0, age=0.35, muscle=0.15, weight=0.45, height=0.52, proportions=0.5),
    "female": dict(gender=1.0, age=0.35, muscle=0.08, weight=0.4, height=0.48, proportions=0.52),
}


def export_sex(label: str, macros: dict[str, float]) -> None:
    from mpfb2.services.humanservice import HumanService  # type: ignore

    HumanService.create_human(
        macrodetail=macros,
        name=f"vitals_{label}",
    )
    obj = bpy.context.active_object
    if obj is None:
        raise RuntimeError("MPFB2 did not create an active object")

    obj_path = OUT / f"{label}-standing-mpfb2.obj"
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.wm.obj_export(filepath=str(obj_path), export_selected_objects=True)

    meta = {
        "sex": label,
        "source": "mpfb2",
        "macros": macros,
        "blender_version": bpy.app.version_string,
    }
    (OUT / f"{label}-standing-mpfb2.meta.json").write_text(
        json.dumps(meta, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Exported {obj_path}")


def main() -> None:
    if not _has_mpfb2():
        print(
            "MPFB2 not found. Install the addon, or use:\n"
            "  python3 body-pipeline/scripts/generate_humans.py",
            file=sys.stderr,
        )
        raise SystemExit(2)

    for label, macros in MACROS.items():
        export_sex(label, macros)
    print("MPFB2 export complete.")


if __name__ == "__main__":
    main()
