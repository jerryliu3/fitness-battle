import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type SkinId = "amber" | "umber" | "rose";
export type KitId = "electric" | "midnight" | "coral";
export type HairId = "crop" | "bun" | "cap";
export interface AvatarLook {
  skin: SkinId;
  kit: KitId;
  hair: HairId;
}
export const skins: Record<SkinId, string> = {
  amber: "#c28a61",
  umber: "#68432f",
  rose: "#e0ad92",
};
export const kits: Record<KitId, string> = {
  electric: "#ef6635",
  midnight: "#3a3d42",
  coral: "#e9d076",
};
export const defaultLook: AvatarLook = {
  skin: "amber",
  kit: "electric",
  hair: "crop",
};

export interface RunnerAvatar {
  group: THREE.Group;
  pose: (distance: number) => void;
  dress: (look: AvatarLook) => void;
}

/** Original articulated sporting character. Cosmetic parts never affect distance. */
export function createAvatar(look: AvatarLook, index: number): RunnerAvatar {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({
    color: skins[look.skin],
    roughness: 0.84,
  });
  const kit = new THREE.MeshStandardMaterial({
    color: kits[look.kit],
    roughness: 0.65,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: "#202b41",
    roughness: 0.83,
  });
  const white = new THREE.MeshStandardMaterial({
    color: "#f9faf2",
    roughness: 0.8,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: index % 2 ? "#291e29" : "#342f30",
    roughness: 1,
  });
  function part(
    parent: THREE.Group,
    geometry: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    parent.add(mesh);
    return mesh;
  }
  const box = (x: number, y: number, z: number, r = 0.06) =>
    new RoundedBoxGeometry(x, y, z, 2, r);
  // A tapered athletic torso, with broad shoulders and a curved jersey silhouette.
  const torsoGeometry = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.19, -0.375),
      new THREE.Vector2(0.23, -0.3),
      new THREE.Vector2(0.25, 0),
      new THREE.Vector2(0.34, 0.25),
      new THREE.Vector2(0.28, 0.37),
      new THREE.Vector2(0.15, 0.45),
    ],
    20,
  );
  const torso = part(group, torsoGeometry, kit, 0, 1.3, 0);
  torso.scale.z = 0.63;
  torso.rotation.x = -0.08;
  part(group, box(0.44, 0.18, 0.34), dark, 0, 0.89, 0);
  part(group, box(0.28, 0.2, 0.015, 0.02), white, 0, 1.37, 0.21);
  part(group, box(0.11, 0.025, 0.02, 0.008), dark, 0, 1.37, 0.222);
  part(
    group,
    new THREE.CylinderGeometry(0.095, 0.11, 0.17, 8),
    skin,
    0,
    1.77,
    0,
  );
  const face = new THREE.Group();
  face.scale.set(0.88, 0.9, 0.88);
  face.position.y = 0.21;
  group.add(face);
  // Face with actual features, rather than a sphere on a capsule.
  const head = part(face, box(0.47, 0.54, 0.42, 0.12), skin, 0, 2.04, -0.03);
  head.rotation.x = -0.05;
  for (const side of [-1, 1]) {
    part(
      face,
      new THREE.SphereGeometry(0.06, 10, 8),
      skin,
      side * 0.245,
      2.02,
      -0.015,
    );
    part(
      face,
      box(0.115, 0.065, 0.025, 0.018),
      white,
      side * 0.1,
      2.06,
      -0.246,
    );
    part(
      face,
      new THREE.SphereGeometry(0.027, 10, 8),
      dark,
      side * 0.1,
      2.056,
      -0.264,
    );
    const brow = part(
      face,
      box(0.125, 0.026, 0.03, 0.009),
      hairMat,
      side * 0.103,
      2.118,
      -0.248,
    );
    brow.rotation.z = side * 0.1;
  }
  part(face, box(0.08, 0.085, 0.08, 0.025), skin, 0, 2.007, -0.265);
  part(face, box(0.09, 0.017, 0.025, 0.006), dark, 0, 1.934, -0.253);
  const hair = new THREE.Group();
  face.add(hair);
  part(hair, box(0.5, 0.17, 0.45, 0.085), hairMat, 0, 2.283, -0.012);
  const sweep = part(
    hair,
    box(0.32, 0.1, 0.14, 0.045),
    hairMat,
    -0.06,
    2.227,
    -0.203,
  );
  sweep.rotation.z = -0.15;
  const bun = new THREE.Group();
  part(bun, new THREE.SphereGeometry(0.16, 12, 10), hairMat, 0, 2.23, 0.24);
  part(bun, new THREE.TorusGeometry(0.09, 0.023, 5, 16), kit, 0, 2.22, 0.15);
  face.add(bun);
  const cap = new THREE.Group();
  part(cap, box(0.51, 0.18, 0.46, 0.08), kit, 0, 2.27, -0.018);
  part(cap, box(0.46, 0.035, 0.23, 0.025), dark, 0, 2.22, -0.3);
  face.add(cap);
  const arms: THREE.Group[] = [],
    legs: THREE.Group[] = [],
    knees: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.39, 1.61, 0);
    arm.rotation.z = side * 0.12;
    group.add(arm);
    arms.push(arm);
    part(arm, new THREE.CapsuleGeometry(0.11, 0.19, 4, 10), kit, 0, -0.13, 0);
    part(arm, new THREE.CapsuleGeometry(0.078, 0.16, 4, 10), skin, 0, -0.31, 0);
    const forearm = new THREE.Group();
    forearm.position.y = -0.36;
    forearm.rotation.x = -1.05;
    arm.add(forearm);
    part(
      forearm,
      new THREE.CapsuleGeometry(0.073, 0.22, 4, 10),
      skin,
      0,
      -0.12,
      0,
    );
    part(forearm, box(0.145, 0.1, 0.12, 0.04), skin, 0, -0.3, 0);
    if (side === -1)
      part(forearm, box(0.155, 0.065, 0.13, 0.02), dark, 0, -0.25, 0);
    const leg = new THREE.Group();
    leg.position.set(side * 0.16, 0.84, 0);
    group.add(leg);
    legs.push(leg);
    part(leg, box(0.26, 0.32, 0.34, 0.045), dark, 0, -0.12, 0);
    part(leg, new THREE.CapsuleGeometry(0.09, 0.18, 4, 10), skin, 0, -0.33, 0);
    const knee = new THREE.Group();
    knee.position.y = -0.43;
    leg.add(knee);
    knees.push(knee);
    part(
      knee,
      new THREE.CapsuleGeometry(0.075, 0.19, 4, 10),
      skin,
      0,
      -0.13,
      0,
    );
    part(
      knee,
      new THREE.CylinderGeometry(0.09, 0.086, 0.11, 10),
      white,
      0,
      -0.29,
      0,
    );
    part(knee, box(0.23, 0.14, 0.38, 0.05), kit, 0, -0.36, -0.08);
    part(knee, box(0.245, 0.045, 0.41, 0.025), white, 0, -0.425, -0.075);
    part(
      knee,
      box(0.045, 0.055, 0.28, 0.008),
      white,
      side * 0.117,
      -0.34,
      -0.06,
    );
  }
  return {
    group,
    pose(distance) {
      const phase = distance * 5 + index * 0.42,
        swing = distance === 0 ? 0 : Math.sin(phase);
      arms.forEach((arm, i) => {
        arm.rotation.x = (i === 0 ? 1 : -1) * swing * 0.68;
      });
      legs.forEach((leg, i) => {
        leg.rotation.x = (i === 0 ? -1 : 1) * swing * 0.55;
        knees[i]!.rotation.x = Math.max(0, (i === 0 ? 1 : -1) * swing) * 0.65;
      });
      torso.rotation.z = swing * 0.025;
    },
    dress(next) {
      skin.color.set(skins[next.skin]);
      kit.color.set(kits[next.kit]);
      hair.visible = next.hair !== "cap";
      bun.visible = next.hair === "bun";
      cap.visible = next.hair === "cap";
    },
  };
}
