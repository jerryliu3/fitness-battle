import { Matrix4, Quaternion, Vector3 } from "three";
import type { VitalsPoseFile, VitalsPoseRot } from "@/lib/vitals-pose";

/** Unmodified native Anny coordinates. JSON matrices are row-major. */
export type AnnyPoseRig = {
  poseParameterization: "local-ref";
  sex: "male" | "female";
  labels: string[];
  parents: number[];
  rest: number[][][];
  localReference: number[][][];
  referenceOrientations: number[][][];
  vertices: number[][];
  faces: number[][];
  skinIndices: number[][];
  skinWeights: number[][];
  display: { scale: number; offset: number[] };
};

export const RIG_SIDE_COLORS = { torso: 0xc4cdd6, left: 0xff2d9a, right: 0x19c3ff };
export const RIG_SIDE_LABELS = { torso: "Torso", left: "Left (.L)", right: "Right (.R)" };
export type RigSide = keyof typeof RIG_SIDE_COLORS;
export function rigSide(label: string): RigSide {
  return label.endsWith(".L") ? "left" : label.endsWith(".R") ? "right" : "torso";
}

function matrix(rows: number[][]): Matrix4 {
  return new Matrix4().set(...rows.flat() as Parameters<Matrix4["set"]>);
}

export function rotvecQuaternion(rot?: VitalsPoseRot): Quaternion {
  const axis = new Vector3(rot?.x ?? 0, rot?.y ?? 0, rot?.z ?? 0);
  const degrees = axis.length();
  return degrees === 0 ? new Quaternion() : new Quaternion().setFromAxisAngle(
    axis.divideScalar(degrees), degrees * Math.PI / 180,
  );
}

/** Anny local-ref FK: Wc = Wp Kref (Uc^-1 D Uc). Skin = Wc Prest^-1.
 * Use every original influence, including twist bones, fingers and all ancestors.
 */
export function createPoseRig(data: AnnyPoseRig) {
  const restInverse = data.rest.map((rows) => matrix(rows).invert());
  const reference = data.localReference.map(matrix);
  const orientation = data.referenceOrientations.map((r) => matrix([
    [...r[0], 0], [...r[1], 0], [...r[2], 0], [0, 0, 0, 1],
  ]));
  const inverseOrientation = orientation.map((m) => m.clone().invert());
  const world = data.labels.map(() => new Matrix4());
  const skin = data.labels.map(() => new Matrix4());
  const positions = new Float32Array(data.vertices.length * 3);
  const heads = data.labels.map(() => new Vector3());
  const rotation = new Matrix4();
  const point = new Vector3();
  const offset = new Vector3(...data.display.offset as [number, number, number]);
  const display = (v: Vector3) => v.set(v.x, v.z, -v.y).add(offset).multiplyScalar(data.display.scale);

  function update(pose: VitalsPoseFile) {
    // Anny exports parents before children; exporter and parity tests enforce this.
    data.labels.forEach((label, i) => {
      rotation.makeRotationFromQuaternion(rotvecQuaternion(pose[label as keyof VitalsPoseFile]));
      world[i].copy(reference[i]).multiply(inverseOrientation[i]).multiply(rotation).multiply(orientation[i]);
      const parent = data.parents[i];
      if (parent >= 0) world[i].premultiply(world[parent]);
      skin[i].multiplyMatrices(world[i], restInverse[i]);
      display(heads[i].setFromMatrixPosition(world[i]));
    });
    data.vertices.forEach((vertex, i) => {
      let x = 0, y = 0, z = 0;
      data.skinWeights[i].forEach((weight, j) => {
        if (!weight) return;
        point.fromArray(vertex).applyMatrix4(skin[data.skinIndices[i][j]]);
        x += weight * point.x;
        y += weight * point.y;
        z += weight * point.z;
      });
      display(point.set(x, y, z)).toArray(positions, i * 3);
    });
  }
  return { update, positions, heads, world, skin };
}
