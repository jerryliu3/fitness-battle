import { fieldProgressTrail } from "./field-course";
import { describe, expect, it } from "vitest";
import { defaultFieldAppearance, fieldAppearanceKey, fieldGrounds, readFieldAppearance } from "./field-appearance";
import { fieldDefaultSpan, fieldScaleMarks, fieldCourse, fieldCourseScene, fieldLap, fieldMarks, fieldScaleScene, fieldOverview, overviewTarget, clampCourseCenter, type FieldNode } from "./field-course";

const lanes = [{ id: "a", name: "A", initials: "A", value: 12 }, { id: "me", name: "Me", initials: "ME", value: 19.2, you: true }];
const flatten = (nodes: FieldNode[]): FieldNode[] => nodes.flatMap(n => [n, ...flatten(n.children ?? [])]);
describe("production course contract", () => {
  it("represents capsules as 300 m or 0.3 mi independently of zoom",()=>{
    for(const [unit,metersPerUnit] of [["km",1000],["mi",1609.344]] as const)for(const span of [.75,1.2,6,12]){
      const course=fieldCourse(390,540,4,{center:18,span},unit,defaultFieldAppearance);
      expect(58*course.markerScale/course.length*span*metersPerUnit).toBeCloseTo(.3*metersPerUnit);
    }
  });
  it("defaults safely and isolates per-account/per-event device preferences", () => {
    for (const raw of [null, "bad", "[]", "null", '{"ground":"__proto__","edges":"bad"}', '{"ground":"constructor"}']) expect(readFieldAppearance(raw)).toEqual(defaultFieldAppearance);
    expect(readFieldAppearance('{"ground":"pool","edges":"open"}')).toEqual({ ground: "pool", edges: "open" });
    expect(fieldAppearanceKey("a:b", "c")).not.toBe(fieldAppearanceKey("a", "b:c"));
    expect(fieldAppearanceKey("a", "running")).not.toBe(fieldAppearanceKey("b", "running"));
  });
  it("zooms both dimensions until the field reaches its minimum width", () => {
    const a = fieldCourse(390, 540, 8, { center: 18, span: 1.2 }, "km", defaultFieldAppearance);
    const b = fieldCourse(390, 540, 8, { center: 18, span: 2.4 }, "km", defaultFieldAppearance);
    expect(b.laneWidth / a.laneWidth).toBe(.5);
    expect(b.markerScale / a.markerScale).toBe(.5);
    expect((b.along(19) - b.along(18)) / (a.along(19) - a.along(18))).toBeCloseTo(.5);
    expect(b.width).toBe(390);
    expect(b.left).toBeGreaterThan(0);
  });
  it("locks the viewport-to-field ratio at 3.9 while depth keeps zooming", () => {
    for (const width of [320, 390, 768]) for (const count of [2, 4, 8, 30]) for (const unit of ["km", "mi", "pts"]) {
      const a = fieldCourse(width, 540, count, { center: 485, span: fieldDefaultSpan(unit) * 100 }, unit, defaultFieldAppearance);
      const b = fieldCourse(width, 540, count, { center: 485, span: fieldDefaultSpan(unit) * 200 }, unit, defaultFieldAppearance);
      const separation = a.point(485, count - 1).x - a.point(485, 0).x;
      expect(width / separation).toBeCloseTo(3.9);
      expect(separation / width).toBeGreaterThan(.25);
      expect(b.laneWidth).toBeCloseTo(a.laneWidth);
      expect(b.point(485, 0).x).toBeCloseTo(a.point(485, 0).x);
      expect(b.drift(486)).toBeCloseTo(a.drift(486));
      expect(b.horizontalZoom).toBeCloseTo(a.horizontalZoom);
      expect(b.zoom / a.zoom).toBeCloseTo(.5);
      expect((b.along(486) - b.along(485)) / (a.along(486) - a.along(485))).toBeCloseTo(.5);
      expect(b.markerScale / a.markerScale).toBeCloseTo(.5);
      expect(b.width).toBe(width);
    }
  });
  it("crosses the width limit continuously and restores horizontal zoom when zooming back in", () => {
    const width = 390, count = 8, base = count * (width - 60) / 5;
    const minWidth = width / 3.9 * count / (count - 1);
    const threshold = fieldDefaultSpan("km") * base / minWidth;
    const course = (span: number) => fieldCourse(width, 540, count, { center: 18, span }, "km", defaultFieldAppearance);
    const before = course(threshold * (1 - 1e-6)), at = course(threshold), after = course(threshold * (1 + 1e-6));
    expect(before.fieldWidth).toBeGreaterThan(at.fieldWidth);
    expect(before.fieldWidth / at.fieldWidth).toBeCloseTo(1, 5);
    expect(after.fieldWidth).toBeCloseTo(at.fieldWidth);
    expect(course(threshold / 2).fieldWidth).toBeCloseTo(at.fieldWidth * 2);
  });
  it("keeps scenery width locked while vertical patterns and object dimensions keep shrinking", () => {
    const scene = (ground: "straight" | "road" | "trail", span: number) => {
      const appearance = { ...defaultFieldAppearance, ground };
      const course = fieldCourse(390, 540, 8, { center: 18, span }, "km", appearance);
      return flatten(fieldCourseScene(course, appearance, lanes, "km", "lock"));
    };
    const a = scene("straight", 12).find(node => node.tag === "pattern")!.attrs;
    const b = scene("straight", 24).find(node => node.tag === "pattern")!.attrs;
    expect(b.width).toBe(a.width);
    expect(Number(b.height) / Number(a.height)).toBeCloseTo(.5);
    const roadA = scene("road", 12).find(node => node.attrs.strokeDasharray)!.attrs;
    const roadB = scene("road", 24).find(node => node.attrs.strokeDasharray)!.attrs;
    expect(roadB.x1).toBe(roadA.x1);
    expect(roadB.strokeWidth).toBe(roadA.strokeWidth);
    const dashA = String(roadA.strokeDasharray).split(" ").map(Number);
    const dashB = String(roadB.strokeDasharray).split(" ").map(Number);
    expect(dashB).toEqual(dashA.map(value => value / 2));
    const treeA = scene("trail", 12).find(node => node.tag === "ellipse" && node.attrs.fill === "#b9c69c")!.attrs;
    const treeB = scene("trail", 24).find(node => node.tag === "ellipse" && node.attrs.fill === "#b9c69c")!.attrs;
    // The sampled world position may change; each tree's aspect ratio follows
    // the camera's independent X/Y scales regardless of its decorative size.
    expect(Number(treeB.ry) / Number(treeB.rx)).toBeCloseTo(Number(treeA.ry) / Number(treeA.rx) / 2);
  });
  it("keeps wide empty/single-athlete fields finite and leaves oval zoom uniform", () => {
    for (const count of [0, 1]) {
      const course = fieldCourse(320, 540, count, { center: 485, span: 40 }, "km", defaultFieldAppearance);
      expect(course.fieldWidth).toBeCloseTo(320 / 3.9);
      expect(JSON.stringify(course.point(485, 0))).not.toMatch(/NaN|Infinity/);
    }
    const appearance = { ...defaultFieldAppearance, ground: "oval" as const };
    const a = fieldCourse(390, 540, 8, { center: 18, span: 6 }, "km", appearance);
    const b = fieldCourse(390, 540, 8, { center: 18, span: 12 }, "km", appearance);
    expect(b.ovalScale / a.ovalScale).toBeCloseTo(.5);
    expect(b.horizontalZoom).toBe(b.zoom);
  });
  it("keeps meander fixed to distance while scenery moves with the camera", () => {
    const a = fieldCourse(390, 540, 4, { center: 18, span: 6 }, "km", defaultFieldAppearance);
    const b = fieldCourse(390, 540, 4, { center: 19, span: 6 }, "km", defaultFieldAppearance);
    expect(a.point(18, 1).x).toBe(b.point(18, 1).x);
    expect(a.point(18, 1).y).not.toBe(b.point(18, 1).y);
    expect(a.point(18, 1).x).not.toBe(a.point(20, 1).x);
  });
  it("bounds scenery and integer side marks over large windows", () => {
    const marks = fieldMarks(0, 5000);
    expect(marks.length).toBeLessThanOrEqual(61);
    expect(marks.every(Number.isInteger)).toBe(true);
    expect(fieldMarks(-4, -1)).toEqual([]);
  });
  it("keeps overview windows within actual accumulated distance and clamps navigation", () => {
    expect(fieldOverview([], { center: 0, span: 6 })).toEqual({ high: 1, from: 0, width: 1 });
    expect(fieldOverview([...lanes, { value: 1000, ghost: true }], { center: 100, span: 6 })).toEqual({ high: 19.2, from: 1, width: 0 });
    expect(overviewTarget(-1, 20)).toBe(0);
    expect(overviewTarget(2, 20)).toBe(20);
    expect(overviewTarget(.25, 20)).toBe(5);
    expect(clampCourseCenter(0, 3, 20, "km", "oval")).toBe(0);
    expect(clampCourseCenter(0, 3, 20, "km", "trail")).toBeGreaterThan(0);
  });
  it("normalizes distance/effort laps without converting or mutating accumulated totals", () => {
    expect(fieldLap(19.2, "km").laps).toBe(19);
    expect(fieldLap(19.2, "mi").laps).toBe(19);
    expect(fieldLap(43, "pts").laps).toBe(2);
    const a = fieldCourse(390, 540, 2, { center: 19, span: 6 }, "km", { ground: "oval", edges: "club" });
    expect(a.point(19.2, 1).x).toBeCloseTo(a.point(.2, 1).x);
    const b = fieldCourse(390, 540, 2, { center: .2, span: 3 }, "km", { ground: "oval", edges: "club" });
    expect(b.point(.2, 1).x).toBeCloseTo(390 / 2);
    expect(lanes[1].value).toBe(19.2);
  });
  it("renders all nine grounds and surroundings through one portable finite scene", () => {
    for (const ground of Object.keys(fieldGrounds) as (keyof typeof fieldGrounds)[]) for (const edges of ["club", "open"] as const) for (const unit of ["km", "mi", "pts"]) {
      const appearance = { ground, edges }, g = fieldCourse(320, 540, 2, { center: 18, span: unit === "pts" ? 20 : 6 }, unit, appearance);
      const nodes = flatten(fieldCourseScene(g, appearance, lanes, unit, `${ground}-${edges}-${unit}`));
      expect(JSON.stringify(nodes)).not.toMatch(/NaN|Infinity|undefined/);
      expect(nodes.filter(n => n.tag === "mask" || n.tag === "linearGradient")).toHaveLength(0);
      expect(nodes.length).toBeLessThan(1500);
    }
  });
});

it("keeps scenery identical as athletes move, without progress ribbons or head masks", () => {
 for (const ground of Object.keys(fieldGrounds) as (keyof typeof fieldGrounds)[]) {
  const appearance = { ground, edges: "club" as const };
  const g = fieldCourse(390, 540, lanes.length, { center: 18, span: 6 }, "km", appearance);
  const before = fieldCourseScene(g, appearance, lanes, "km", "stable");
  const after = fieldCourseScene(g, appearance, lanes.map(l => ({ ...l, value: l.value + 2 })), "km", "stable");
  expect(after).toEqual(before);
  expect(flatten(after).some(n => n.tag === "mask" || n.tag === "linearGradient")).toBe(false);
 }
});

it("uses whole-unit ruler marks even at close chase scales",()=>{for(const unit of ["km","mi"]){const g=fieldCourse(390,540,4,{center:18.2,span:1.2},unit,defaultFieldAppearance);const labels=fieldScaleScene(g,unit).filter(n=>n.tag==="text").slice(1);expect(labels.length).toBeGreaterThan(0);expect(labels.every(n=>Number.isInteger(Number(n.text)))).toBe(true);}});

it("bounds the ruler to five marks across chase and very wide windows",()=>{
 for(const [min,max] of [[0,40],[12,52],[0,500],[1,3],[18,18.8]]){
  const marks=fieldScaleMarks(min!,max!);expect(marks.length).toBeLessThanOrEqual(5);expect(marks.every(v=>v>=Math.max(0,min!)&&v<=max!)).toBe(true);
 }
});

it("shows five lanes at default zoom on phone and desktop without changing distance scale", () => {
  for (const width of [320, 390, 768]) {
    const view = { center: 18, span: 1.2 };
    const course = fieldCourse(width, 540, 12, view, "km", defaultFieldAppearance);
    expect((width - 60) / course.laneWidth).toBeCloseTo(5);
    expect(Math.abs(course.along(18.3) - course.along(18))).toBeCloseTo(course.length * .3 / 1.2);
  }
});

it("bounds painted scenery to the visible lane band without changing lane geometry", () => {
  const roster = Array.from({ length: 100 }, (_, i) => ({ id: String(i), name: String(i), initials: "A", value: 18.2, you: i === 50 }));
  const course = fieldCourse(390, 540, roster.length, { center: 18, span: 1.2 }, "km", defaultFieldAppearance);
  const full = flatten(fieldCourseScene(course, defaultFieldAppearance, roster, "km", "test"));
  const visible = flatten(fieldCourseScene(course, defaultFieldAppearance, roster, "km", "test", { first: 47, last: 53 }));
  expect(visible.length).toBeLessThan(full.length / 4);
  expect(visible.length).toBeLessThan(250);
  expect(JSON.stringify(visible)).not.toMatch(/NaN|Infinity/);
});

it("clips a solid route independently of the head and start visibility", () => {
  for (const ground of ["straight", "trail", "oval"] as const) {
    const course = fieldCourse(390, 540, 8, { center: 18, span: 1.2 }, "km", { ...defaultFieldAppearance, ground });
    expect(fieldProgressTrail(course, 18, 3, "km")).toContain("L");
    expect(fieldProgressTrail(course, 100, 3, "km")).toContain("L");
    expect(fieldProgressTrail(course, 0, 3, "km")).toBe("");
    expect(fieldProgressTrail(course, 100, 3, "km")).not.toMatch(/NaN|Infinity/);
  }
});
