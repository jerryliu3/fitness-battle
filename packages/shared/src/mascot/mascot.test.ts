import { describe, expect, it } from "vitest";
import { EMBER_ACTIONS, EMBER_CLIPS, EMBER_MODEL, EMBER_REST, blendEmberPoses, createEmberScene, deformEmberPoint, emberContour, exportEmberSvg, normalizeEmberPose, sampleEmber, type EmberNode } from "./index";

function flatten(nodes: EmberNode[]): EmberNode[] { return nodes.flatMap(n => [n, ...flatten(n.children ?? [])]); }

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
    expect(svg).toContain('stop-opacity="0.95"');
    expect(svg).not.toMatch(/NaN|Infinity|undefined|<image|<rect|strokeWidth/);
    expect(JSON.stringify(createEmberScene({ id: '\"><script>' }))).not.toContain("<script>");
  });
  it("keeps the depth rim inside the same silhouette and never draws a translated back star", () => {
    for (const action of EMBER_ACTIONS) {
      const p = sampleEmber(action, EMBER_CLIPS[action].duration * EMBER_CLIPS[action].poster);
      const scene = createEmberScene({ id: "depth", pose: p });
      const all = flatten(scene);
      const face = all.find(n => n.attrs.fill === "url(#ember-depth-gold)")!;
      const rim = all.find(n => n.attrs.stroke === "url(#ember-depth-rim)")!;
      const clip = all.find(n => n.attrs.id === "ember-depth-body")!;
      const bodyGroup = scene.find(n => n.children?.includes(face))!;
      const shading = bodyGroup.children!.find(n => n.attrs.clipPath === "url(#ember-depth-body)")!;
      expect(face.attrs.d).toBe(clip.children![0].attrs.d);
      expect(rim.attrs.d).toBe(face.attrs.d);
      expect(rim.attrs.transform).toBeUndefined();
      expect(face.attrs.transform).toBeUndefined();
      expect(shading.children).toContain(rim);
      expect(bodyGroup.children).toHaveLength(2); // One outline and its clipped surface layers.
    }
  });
  it("makes the three reference moves travel in distinct directions and holds a longer dash", () => {
    const forwardA = sampleEmber("flyForward", 3000 * 0.27), forwardB = sampleEmber("flyForward", 3000 * 0.67);
    expect(forwardB.x - forwardA.x).toBeGreaterThan(40);
    expect(Math.abs(forwardB.y - forwardA.y)).toBeLessThan(10);
    expect(forwardB.heading).toBe(0);
    const diagonalA = sampleEmber("flyDiagonal", 2800 * 0.29), diagonalB = sampleEmber("flyDiagonal", 2800 * 0.67);
    expect(diagonalB.x - diagonalA.x).toBeGreaterThan(35);
    expect(diagonalB.y - diagonalA.y).toBeLessThan(-50);
    expect(diagonalB.heading).toBe(-45);
    const up = sampleEmber("jumpUp", 2100 * 0.46);
    expect(up).toMatchObject({ x: 0, y: -88, heading: -90, armLeft: 1, armRight: 1 });
    expect(EMBER_CLIPS.dash.duration).toBeGreaterThanOrEqual(2400);
    expect(sampleEmber("dash", 2400 * 0.65).trail).toBe(1);
    expect(sampleEmber("dash", 2400 * 0.79).crest).toBeLessThan(0);
    const effects = createEmberScene({ id: "up", pose: up }).find(n => n.attrs.transform === "translate(180 130) rotate(-90)");
    expect(effects?.attrs.opacity).toBe(0.85);
  });
  it("keeps the animated body within the exported viewport throughout every clip", () => {
    const [left, top, width, height] = EMBER_MODEL.viewBox.split(" ").map(Number);
    for (const action of EMBER_ACTIONS) {
      const bounds = [Infinity, Infinity, -Infinity, -Infinity];
      for (let frame = 0; frame <= 60; frame++) {
        const p = sampleEmber(action, EMBER_CLIPS[action].duration * frame / 60);
        let start: readonly number[] = EMBER_MODEL.start;
        for (const segment of EMBER_MODEL.body) {
          const points = [start, [segment[0], segment[1]], [segment[2], segment[3]], [segment[4], segment[5]]].map(([x, y]) => deformEmberPoint(x, y, p));
          for (let step = 0; step <= 20; step++) {
            const t = step / 20, u = 1 - t;
            const weights = [u ** 3, 3 * u * u * t, 3 * u * t * t, t ** 3];
            const localX = (points.reduce((v, pt, i) => v + pt[0] * weights[i], 0) - 180) * p.scaleX * Math.cos(p.yaw * 1.12);
            const localY = (points.reduce((v, pt, i) => v + pt[1] * weights[i], 0) - 235) * p.scaleY;
            const radians = p.rotation * Math.PI / 180;
            const x = 180 + p.x + localX * Math.cos(radians) - localY * Math.sin(radians);
            const y = 235 + p.y + localX * Math.sin(radians) + localY * Math.cos(radians);
            bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y);
            bounds[2] = Math.max(bounds[2], x); bounds[3] = Math.max(bounds[3], y);
          }
          start = [segment[4], segment[5]];
        }
      }
      expect(bounds[0], action).toBeGreaterThanOrEqual(left);
      expect(bounds[1], action).toBeGreaterThanOrEqual(top);
      expect(bounds[2], action).toBeLessThanOrEqual(left + width);
      expect(bounds[3], action).toBeLessThanOrEqual(top + height);
    }
  });
});
