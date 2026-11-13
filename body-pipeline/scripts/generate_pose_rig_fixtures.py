#!/usr/bin/env python3
"""Regenerate independent PyTorch/Anny expectations for the browser FK/LBS tests.

Run from repo root: body-pipeline/.venv/bin/python3 body-pipeline/scripts/generate_pose_rig_fixtures.py
"""
import json
from pathlib import Path

import numpy as np
import roma
import torch
from anny import Anny

from export_pose_rig import export_rig
from generate_humans import _phenotype
from lib.mesh_common import _default_standing_pose

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "apps/web/src/lib/__fixtures__/anny-pose-rig.json"


def main():
    fixtures = []
    for sex in ("male", "female"):
        rig = export_rig(sex)
        model = Anny(local_changes="default", rig="anny", pose_parameterization="local-ref",
                     skinning_method="lbs").to(dtype=torch.float32)
        # Sample a strongest-influence vertex for every bone plus distributed surface points.
        indices = model.vertex_bone_indices.numpy().reshape(len(rig["vertices"]), -1)
        weights = model.vertex_bone_weights.numpy().reshape(len(rig["vertices"]), -1)
        samples = sorted(set([int(np.where(indices == i, weights, 0).max(1).argmax())
                              for i in range(model.bone_count)] + list(range(0, len(indices), 401))))
        poses = [{}, _default_standing_pose()]
        # Each actual slider is exercised separately, plus mixed axes/ancestor composition.
        for label in _default_standing_pose():
            for axis in range(3):
                vector = [0, 0, 0]
                vector[axis] = 37
                poses.append({label: vector})
        poses.append({label: [17, -23, 31] for label in _default_standing_pose()})
        expected = []
        for pose in poses:
            rv = torch.tensor([pose.get(label, [0, 0, 0]) for label in model.bone_labels], dtype=torch.float32)
            parameters = roma.Rigid(roma.rotvec_to_rotmat(torch.deg2rad(rv)), torch.zeros(len(rv), 3))[None].to_homogeneous()
            with torch.no_grad():
                output = model(pose_parameters=parameters, phenotype_kwargs=_phenotype(sex))
            expected.append({
                "pose": {label: dict(zip(["x", "y", "z"], vector)) for label, vector in pose.items()},
                "heads": output["bone_poses"][0, :, :3, 3].tolist(),
                "vertices": output["vertices"][0, samples].tolist(),
            })
        for key in ("vertices", "skinIndices", "skinWeights"):
            rig[key] = [rig[key][i] for i in samples]
        rig["faces"] = []
        fixtures.append({"rig": rig, "expected": expected})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    def compact(value):
        if isinstance(value, float):
            return round(value, 7)
        if isinstance(value, list):
            return [compact(item) for item in value]
        if isinstance(value, dict):
            return {key: compact(item) for key, item in value.items()}
        return value
    OUT.write_text(json.dumps(compact(fixtures), separators=(",", ":")))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
