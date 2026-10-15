import { describe, expect, it } from "vitest";
import { EMBER_ACTIONS, EMBER_CLIPS, EMBER_REST, blendEmberPoses, createEmberScene, deformEmberPoint, emberContour, exportEmberSvg, normalizeEmberPose, sampleEmber, type EmberNode } from "./index";

describe("Star Ember model", () => {
  it("keeps one closed cubic contour with matching topology across every motion clip", () => {
    const base = emberContour({ ...EMBER_REST }).replace(/[-\d.]+/g, "");
    for (const action of EMBER_ACTIONS) {
      for (let i = 0; i <= 24; i++) {
        const pose = sampleEmber(action, EMBER_CLIPS[action].duration * i / 24);
        const contour = emberContour(pose);
        expect(contour.replace(/[-\d.]+/g, "")).toBe(base);
        expect(contour).not.toMatch(/NaN|Infinity/);
        expect(contour.endsWith(" Z")).toBe(true);
      }
    }
  });
  it("is deterministic, loops cleanly and clamps a one-shot to rest", () => {
    for (const action of EMBER_ACTIONS) {
      const duration = EMBER_CLIPS[action].duration;
      expect(sampleEmber(action, -100)).toEqual(EMBER_REST);
      expect(sampleEmber(action, duration)).toEqual(EMBER_REST);
      expect(sampleEmber(action, duration * 5)).toEqual(EMBER_REST);
      expect(sampleEmber(action, 100, { loop: true })).toEqual(sampleEmber(action, duration + 100, { loop: true }));
      expect(sampleEmber(action, duration / 2, { reducedMotion: true })).toEqual(EMBER_REST);
      expect(sampleEmber(action, NaN)).toEqual(EMBER_REST);
    }
  });
  it("bends the right point without moving the face or opposite point", () => {
    const rest = { ...EMBER_REST };
    const raised = normalizeEmberPose({ armRight: 1 });
    expect(deformEmberPoint(308, 177, raised)[1]).toBeLessThan(150);
    expect(deformEmberPoint(45, 172, raised)).toEqual(deformEmberPoint(45, 172, rest));
    expect(deformEmberPoint(180, 206, raised)).toEqual([180, 206]);
  });
  it("keeps corrupt or unbounded input finite and can blend partial poses", () => {
    expect(normalizeEmberPose({ yaw: Infinity, crest: NaN, eyeLeft: -3, scaleY: 90 })).toMatchObject({ yaw: 0, crest: 0, eyeLeft: 0, scaleY: 1.35 });
    expect(blendEmberPoses({}, { armRight: 1 }, 0.5).armRight).toBe(0.5);
    expect(blendEmberPoses({}, { armRight: 1 }, NaN)).toEqual(EMBER_REST);
  });
  it("uses isolated IDs and resolves every clip/gradient reference in the shared display list", () => {
    function flatten(nodes: EmberNode[]): EmberNode[] { return nodes.flatMap(n => [n, ...flatten(n.children ?? [])]); }
    const a = flatten(createEmberScene({ id: "instance-a" }));
    const b = flatten(createEmberScene({ id: "instance-b" }));
    const ids = a.map(n => n.attrs.id).filter(Boolean);
    for (const n of a) for (const value of Object.values(n.attrs)) {
      if (typeof value === "string" && value.startsWith("url(#")) expect(ids).toContain(value.slice(5, -1));
    }
    expect(b.map(n => n.attrs.id).filter(Boolean).some(id => ids.includes(id))).toBe(false);
    expect(a.find(n => n.attrs.id === "ember-instance-a-body")?.children?.[0].attrs.d).toBe(emberContour({ ...EMBER_REST }));
  });
  it("exports self-contained transparent SVGs with XML attributes and no unsafe IDs", () => {
    const svg = exportEmberSvg({ pose: sampleEmber("wave", 600), expression: "wink" });
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('clip-path="url(#ember-export-body)"');
    expect(svg).toContain('stop-color="#ffd648"');
    expect(svg).not.toMatch(/NaN|Infinity|undefined|<image|<rect|strokeWidth/);
    expect(JSON.stringify(createEmberScene({ id: '\"><script>' }))).not.toContain("<script>");
  });
});
