import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import fixtures from "./__fixtures__/anny-pose-rig.json";
import { createPoseRig, type AnnyPoseRig } from "./vitals-pose-rig-layout";
import { findArmSidePreset, poseFromPreset } from "./vitals-pose-arm-presets";
import { VITALS_POSE_BONES, type VitalsPoseFile } from "./vitals-pose";

// Expected coordinates come from Anny/PyTorch, not the browser implementation.
// Regenerate with body-pipeline/scripts/generate_pose_rig_fixtures.py.
for (const fixture of fixtures) {
  const data = fixture.rig as AnnyPoseRig;
  const display = (values: number[]) => new Vector3(values[0], values[2], -values[1])
    .add(new Vector3(...data.display.offset as [number, number, number])).multiplyScalar(data.display.scale);
  describe(`${data.sex} Anny parity`, () => {
    it("exports every slider and its real ancestors in dependency order", () => {
      for (const label of VITALS_POSE_BONES) expect(data.labels).toContain(label);
      data.parents.forEach((parent, i) => expect(parent).toBeLessThan(i));
    });
    it("matches Python joints and skinned vertices at identity, defaults, every slider axis and a combined pose", () => {
      const rig = createPoseRig(data);
      for (const expected of fixture.expected) {
        rig.update(expected.pose as VitalsPoseFile);
        expected.heads.forEach((head, i) => {
          expect(rig.heads[i].distanceTo(display(head)), `joint ${data.labels[i]} ${JSON.stringify(expected.pose)}`).toBeLessThan(0.00002);
        });
        expected.vertices.forEach((vertex, i) => {
          expect(new Vector3().fromArray(rig.positions, i * 3).distanceTo(display(vertex)), `vertex ${i} ${JSON.stringify(expected.pose)}`).toBeLessThan(0.00002);
        });
      }
    });
    it("soldier keeps both elbows and wrists below shoulders, straight and close to their sides", () => {
      const rig = createPoseRig(data);
      rig.update(poseFromPreset(findArmSidePreset("soldier")!));
      for (const side of ["L", "R"]) {
        const head = (name: string) => rig.heads[data.labels.indexOf(`${name}.${side}`)];
        const shoulder = head("upperarm01"), elbow = head("lowerarm01"), wrist = head("wrist");
        expect(shoulder.y - elbow.y).toBeGreaterThan(0.2);
        expect(elbow.y - wrist.y).toBeGreaterThan(0.2);
        expect(Math.abs(wrist.x - shoulder.x)).toBeLessThan(0.12);
        expect(Math.abs(wrist.z - shoulder.z)).toBeLessThan(0.05);
        const upper = elbow.clone().sub(shoulder).normalize();
        const lower = wrist.clone().sub(elbow).normalize();
        expect(upper.dot(lower)).toBeGreaterThan(0.99);
        const index = head("finger2-1").clone().sub(wrist);
        const little = head("finger5-1").clone().sub(wrist);
        // This directed palm-plane normal was checked against the visible thumb/palm.
        expect(index.cross(little).normalize().x).toBeGreaterThan(0.97);
      }
    });
  });
}
