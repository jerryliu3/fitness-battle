import { describe, expect, it } from "vitest";
import { EMBER_ACTIONS, EMBER_CLIPS, EMBER_MODEL, EMBER_REST, blendEmberPoses, createEmberScene, deformEmberPoint, emberContour, emberDepthOffset, emberSideWalls, exportEmberSvg, normalizeEmberPose, sampleEmber, type EmberNode, type EmberPose } from "./index";

function flatten(nodes: EmberNode[]): EmberNode[] { return nodes.flatMap(n => [n, ...flatten(n.children ?? [])]); }
function sampleOutline(p: EmberPose, steps = 16): number[][] {
  let start: readonly number[] = EMBER_MODEL.start;
  return EMBER_MODEL.body.flatMap(segment => {
    const points = [start, [segment[0], segment[1]], [segment[2], segment[3]], [segment[4], segment[5]]].map(([x, y]) => deformEmberPoint(x, y, p));
    start = [segment[4], segment[5]];
    return Array.from({ length: steps }, (_, step) => {
      const t = step / steps, u = 1 - t, weights = [u ** 3, 3 * u * u * t, 3 * u * t * t, t ** 3];
      return [0, 1].map(k => points.reduce((v, pt, i) => v + pt[k] * weights[i], 0));
    });
  });
}

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
    expect(deformEmberPoint(308, 177, raised)[1]).toBeLessThan(160);
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
    expect(svg).not.toMatch(/NaN|Infinity|undefined|<image|<rect|strokeWidth/);
    expect(JSON.stringify(createEmberScene({ id: '\"><script>' }))).not.toContain("<script>");
  });
  it("connects the side walls to the face without an outline border or a second back star", () => {
    for (const action of EMBER_ACTIONS) {
      const p = sampleEmber(action, EMBER_CLIPS[action].duration * EMBER_CLIPS[action].poster);
      const scene = createEmberScene({ id: "depth", pose: p });
      const all = flatten(scene);
      const face = all.find(n => n.attrs.fill === "url(#ember-depth-gold)")!;
      const clip = all.find(n => n.attrs.id === "ember-depth-body")!;
      const bodyGroup = scene.find(n => n.children?.includes(face))!;
      const walls = bodyGroup.children![0];
      expect(face.attrs.d).toBe(clip.children![0].attrs.d);
      expect(walls.attrs.fill).toBe(EMBER_MODEL.palette.edge);
      expect(walls.attrs.d).toBe(emberSideWalls(p));
      expect(String(walls.attrs.d).match(/ Z/g)).toHaveLength(EMBER_MODEL.body.length);
      expect(walls.attrs.stroke).toBeUndefined();
      expect(walls.attrs.transform).toBeUndefined();
      expect(face.attrs.transform).toBeUndefined();
      expect(face.attrs.stroke).toBeUndefined();
      // Each wall contains one original cubic and its reversed depth-offset edge.
      for (const wall of String(walls.attrs.d).split(" Z").filter(s => s.trim())) {
        const values = wall.match(/-?[\d.]+/g)!.map(Number);
        const a = values.slice(0, 8), b = values.slice(8);
        const [dx, dy] = emberDepthOffset(p);
        for (let i = 0; i < 4; i++) {
          expect(Math.abs(b[6 - i * 2] - a[i * 2])).toBeCloseTo(Math.abs(dx), 1);
          expect(Math.abs(b[7 - i * 2] - a[i * 2 + 1])).toBeCloseTo(Math.abs(dy), 1);
        }
      }
      expect(bodyGroup.children).toHaveLength(3);
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
    expect(sampleEmber("dash", 2400 * 0.88).crest).toBeLessThan(0);
    const effects = createEmberScene({ id: "up", pose: up }).find(n => n.attrs.transform === "translate(180 130) rotate(-90)");
    expect(effects?.attrs.opacity).toBe(0.85);
  });
  it("preserves distal limb lengths while rotating at shoulder, hip and crest joints", () => {
    const cases = [
      ["armLeft", [45, 172], EMBER_MODEL.joints.armLeft],
      ["armRight", [308, 177], EMBER_MODEL.joints.armRight],
      ["legLeft", [109, 346], EMBER_MODEL.joints.legLeft],
      ["legRight", [250, 345], EMBER_MODEL.joints.legRight],
      ["crest", [140, 57], EMBER_MODEL.joints.crest],
    ] as const;
    for (const [key, [x, y], joint] of cases) for (const value of [-1, -0.5, 0.5, 1]) {
      const p = normalizeEmberPose({ [key]: value }), moved = deformEmberPoint(x, y, p);
      expect(Math.hypot(moved[0] - joint[0], moved[1] - joint[1]), key).toBeCloseTo(Math.hypot(x - joint[0], y - joint[1]), 5);
      expect(deformEmberPoint(joint[0], joint[1], p), key).toEqual([...joint]);
    }
  });
  it("sweeps both arms behind flight, delays the crest, and settles the depth after braking", () => {
    for (const action of ["dash", "flyForward", "flyDiagonal"] as const) {
      const clip = EMBER_CLIPS[action], cruise = sampleEmber(action, clip.duration * clip.poster);
      for (const [tip, joint] of [[[45, 172], EMBER_MODEL.joints.armLeft], [[308, 177], EMBER_MODEL.joints.armRight]] as const) {
        const moved = deformEmberPoint(tip[0], tip[1], cruise), angle = (cruise.rotation - cruise.heading) * Math.PI / 180;
        const dx = (moved[0] - joint[0]) * Math.cos(cruise.yaw * 1.12), dy = moved[1] - joint[1];
        expect(dx * Math.cos(angle) - dy * Math.sin(angle), action).toBeLessThan(0);
      }
      const launch = sampleEmber(action, clip.duration * 0.29), recovery = sampleEmber(action, clip.duration * 0.94);
      expect(launch.depth).toBeGreaterThan(0.7);
      expect(launch.crest).toBeLessThan(cruise.crest * 0.5);
      expect(Math.hypot(...emberDepthOffset(cruise))).toBeGreaterThan(Math.hypot(...emberDepthOffset(recovery)) + 6);
      expect(recovery.depth).toBeLessThan(0.1);
      expect(sampleEmber(action, clip.duration)).toEqual(EMBER_REST);
    }
    const before = sampleEmber("flyForward", 1439).x, at = sampleEmber("flyForward", 1440).x, after = sampleEmber("flyForward", 1441).x;
    expect(after - at).toBeGreaterThan(0.02); // Cruise through the keyframe rather than stopping there.
    expect(Math.abs((after - at) - (at - before))).toBeLessThan(0.001);
  });
  it("avoids folded-arm intersections with the torso throughout each clip", () => {
    const cross = (a: number[], b: number[], c: number[]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    for (const action of EMBER_ACTIONS) for (let frame = 0; frame <= 60; frame++) {
      const points = sampleOutline(sampleEmber(action, EMBER_CLIPS[action].duration * frame / 60));
      for (let i = 0; i < points.length; i++) for (let j = i + 2; j < points.length; j++) {
        if (i === 0 && j === points.length - 1) continue;
        const a = points[i], b = points[(i + 1) % points.length], c = points[j], d = points[(j + 1) % points.length];
        const intersects = cross(a, b, c) * cross(a, b, d) < -1e-8 && cross(c, d, a) * cross(c, d, b) < -1e-8;
        if (intersects) throw new Error(`${action} at ${frame / 60}: contour crosses itself`);
      }
    }
  });
  it("keeps the animated body within the exported viewport throughout every clip", () => {
    const [left, top, width, height] = EMBER_MODEL.viewBox.split(" ").map(Number);
    for (const action of EMBER_ACTIONS) {
      const bounds = [Infinity, Infinity, -Infinity, -Infinity];
      for (let frame = 0; frame <= 60; frame++) {
        const p = sampleEmber(action, EMBER_CLIPS[action].duration * frame / 60);
        for (const [px, py] of sampleOutline(p, 20)) {
          for (const [dx, dy] of [[0, 0], emberDepthOffset(p)]) {
            const localX = (px + dx - 180) * p.scaleX * Math.cos(p.yaw * 1.12);
            const localY = (py + dy - 235) * p.scaleY;
            const radians = p.rotation * Math.PI / 180;
            const x = 180 + p.x + localX * Math.cos(radians) - localY * Math.sin(radians);
            const y = 235 + p.y + localX * Math.sin(radians) + localY * Math.cos(radians);
            bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y);
            bounds[2] = Math.max(bounds[2], x); bounds[3] = Math.max(bounds[3], y);
          }
        }
      }
      expect(bounds[0], action).toBeGreaterThanOrEqual(left);
      expect(bounds[1], action).toBeGreaterThanOrEqual(top);
      expect(bounds[2], action).toBeLessThanOrEqual(left + width);
      expect(bounds[3], action).toBeLessThanOrEqual(top + height);
    }
  });
});
