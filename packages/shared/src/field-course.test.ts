import { describe, expect, it } from "vitest";
import { defaultFieldAppearance, fieldAppearanceKey, fieldGrounds, readFieldAppearance } from "./field-appearance";
import { fieldCourse, fieldCourseScene, fieldLap, fieldMarks, fieldScaleScene, fieldOverview, overviewTarget, clampCourseCenter, type FieldNode } from "./field-course";

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
  it("zooms both dimensions and the racer by the same factor with side whitespace", () => {
    const a = fieldCourse(390, 540, 8, { center: 18, span: 6 }, "km", defaultFieldAppearance);
    const b = fieldCourse(390, 540, 8, { center: 18, span: 12 }, "km", defaultFieldAppearance);
    expect(b.laneWidth / a.laneWidth).toBe(.5);
    expect(b.markerScale / a.markerScale).toBe(.5);
    expect((b.along(19) - b.along(18)) / (a.along(19) - a.along(18))).toBeCloseTo(.5);
    expect(b.width).toBe(390);
    expect(b.left).toBeGreaterThan(0);
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
      expect(nodes.filter(n => n.tag === "mask")).toHaveLength(1);
      const stops = nodes.filter(n => n.tag === "stop");
      expect(stops.some(n => n.attrs.stopOpacity === 0)).toBe(true);
      expect(stops.every(n => Number(n.attrs.stopOpacity) <= .23)).toBe(true);
      expect(nodes.length).toBeLessThan(1500);
    }
  });
});

it("fades earned distance toward the athlete and darkens back toward the start", () => {
 const g=fieldCourse(390,540,1,{center:2,span:6},"km",defaultFieldAppearance);
 const nodes=flatten(fieldCourseScene(g,defaultFieldAppearance,[{id:"me",name:"Me",initials:"ME",value:2,you:true}],"km","fade"));
 const gradient=nodes.find(n=>n.tag==="linearGradient"&&String(n.attrs.id).includes("-progress-"))!;
 expect(gradient.children?.[0].attrs.stopOpacity).toBe(.23);
 expect(gradient.children?.[1].attrs.stopOpacity).toBe(0);
});

it("uses whole-unit ruler marks even at close chase scales",()=>{for(const unit of ["km","mi"]){const g=fieldCourse(390,540,4,{center:18.2,span:1.2},unit,defaultFieldAppearance);const labels=fieldScaleScene(g,unit).filter(n=>n.tag==="text").slice(1);expect(labels.length).toBeGreaterThan(0);expect(labels.every(n=>Number.isInteger(Number(n.text)))).toBe(true);}});
