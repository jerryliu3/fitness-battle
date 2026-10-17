import { describe, expect, it } from "vitest";
import { createEmberScene, sampleEmberSkid, type EmberNode } from "@fitness-battle/shared/mascot";
import { createStyledScene, MOTION_STYLES, reshapeContour } from "./motion-art";
const paths = (nodes: EmberNode[]): string[] => nodes.flatMap(n => [...(typeof n.attrs.d === "string" ? [n.attrs.d] : []), ...paths(n.children ?? [])]);
describe("loading style geometry", () => {
  it("retains the exact canonical K contour in every style", () => {
    const opts = { id: "endpoint", morph: 1, morphConcept: "crest-launch" as const, shadow: false };
    const original = paths(createEmberScene(opts));
    for (const style of MOTION_STYLES) {
      expect(paths(createStyledScene(style, opts)).filter(p => !original.includes(p))).toEqual([]);
      expect(reshapeContour("M 10 20 L 30 40 Z", style, 1)).toBe("M 10 20 L 30 40 Z");
    }
  });
  it("keeps finite paths through the complete launch", () => {
    for (const style of MOTION_STYLES) for (let i=0;i<=100;i++) {
      const frame = sampleEmberSkid(i/100, {returnToK:true});
      const result = createStyledScene(style, { id: style.id, pose:frame.pose, morph:frame.morph, morphConcept:"crest-launch",launchFlight:frame.flight,launchCrouch:frame.crouch,launchSkid:frame.skid,shadow:false });
      expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity|undefined/);
      expect(paths(result).every(p=>p.length>0)).toBe(true);
    }
  });
  it("changes the contour rather than only recoloring the body", () => {
    const path = "M 140 57 C 154 45 211 64 228 155 L 308 177 Z";
    const variants = MOTION_STYLES.map(s=>reshapeContour(path,s,0));
    expect(new Set(variants).size).toBe(3);
    expect(variants.every(p=>p!==path)).toBe(true);
  });
});
