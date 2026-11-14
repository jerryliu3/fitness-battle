#!/usr/bin/env python3
"""Export Anny's actual reference frames and LBS inputs for the local pose lab.

Matrices use row-major JSON order; coordinates remain in Anny's native space.
No guessed bone lengths, axes, hierarchy or four-influence weight truncation.
"""
import argparse
import json
from pathlib import Path

import numpy as np
import torch
from anny import Anny

from generate_humans import _phenotype


def export_rig(sex):
    model = Anny(local_changes="default", rig="anny", pose_parameterization="local-ref",
                 skinning_method="lbs").to(dtype=torch.float32)
    phenotype = _phenotype(sex)
    with torch.no_grad():
        output = model(phenotype_kwargs=phenotype)
    rest = output["rest_bone_poses"][0]
    reference = output["bone_poses"][0]
    local = reference.clone()
    for i, parent in enumerate(model.bone_parents):
        if parent >= 0:
            local[i] = torch.linalg.inv(reference[parent]) @ reference[i]
    orientation = model.reference_bone_orientations
    if orientation is None:
        orientation = rest[:, :3, :3]
    # Fixed display transform, shared by mesh and rig for every slider position.
    # Do not refit/recenter on every pose: that hides movement and changes scale.
    vertices = output["vertices"][0].numpy()
    vertices = vertices[:, [0, 2, 1]] * np.array([1, 1, -1])
    low, high = vertices.min(0), vertices.max(0)
    scale = 1.74 / (high[1] - low[1])
    return {
        "poseParameterization": "local-ref",
        "sex": sex,
        "phenotype": phenotype,
        "labels": list(model.bone_labels),
        "parents": list(model.bone_parents),
        "rest": rest.tolist(),
        "localReference": local.tolist(),
        "referenceOrientations": orientation.tolist(),
        "vertices": output["rest_vertices"][0].tolist(),
        "faces": model.faces.tolist(),
        "skinIndices": model.vertex_bone_indices.reshape(len(vertices), -1).tolist(),
        "skinWeights": model.vertex_bone_weights.reshape(len(vertices), -1).tolist(),
        "display": {"scale": float(scale), "offset": [float(-(low[0]+high[0])/2),
                                                       float(-low[1]), float(-(low[2]+high[2])/2)]},
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--sex", choices=["male", "female"], required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(export_rig(args.sex), separators=(",", ":")))
