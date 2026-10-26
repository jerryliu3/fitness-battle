import { expect, it } from "vitest";
import { portraitField, portraitFieldGap, portraitDepthAt } from "./portrait-field";
import { fieldCourse, defaultFieldAppearance } from "./index";
const lanes = [
  { id: "a", name: "Ahead", initials: "A", value: 12 },
  { id: "you", name: "You", initials: "Y", value: 10, you: true },
  { id: "b", name: "Behind", initials: "B", value: 8 },
  { id: "past", name: "Past", initials: "P", value: 99, ghost: true },
];
it("keeps ranks, gaps and out-of-window distances true without ranking past you", () => {
  const s = portraitField(lanes, { center: 10, span: 1.2 });
  expect(s.place).toBe(2);
  expect(s.fieldSize).toBe(3);
  expect(s.nextGap).toBe(2);
  expect(s.markers.find((m) => m.you)?.x).toBe(210);
  expect(s.outside.find((m) => m.id === "a")?.outside).toBe(true);
  expect(s.outside.find((m) => m.id === "a")?.gap).toBe(2);
  expect(portraitFieldGap(null, "pts")).toContain("leading");
  expect(portraitFieldGap(2, "mi")).toBe("2 mi to next rival");
});
it("retains lane identity across overtakes, changes zoom depth and reaches every peer with independent distance and lane panning", () => {
  const a = portraitField(lanes, { center: 10, span: 10 });
  const b = portraitField(
    lanes.map((l) => ({ ...l, value: l.you ? 14 : l.value })),
    { center: 8, span: 2 },
    "b",
  );
  expect(a.ordered.map((l) => l.id)).toEqual(b.ordered.map((l) => l.id));
  expect(b.markers.find((m) => m.id === "b")?.x).toBe(210);
  expect(a.markers.find((m) => m.id === "a")?.y).not.toBe(
    b.markers.find((m) => m.id === "a")?.y,
  );
  expect(JSON.stringify(portraitField([], { center: 0, span: 0 }))).not.toMatch(
    /NaN|Infinity/,
  );
});
it("triples underlying horizontal lane spacing while retaining distance and racer dimensions", () => {
  const course = fieldCourse(
    390,
    540,
    4,
    { center: 10, span: 1.2 },
    "km",
    defaultFieldAppearance,
  );
  expect(course.laneWidth).toBeCloseTo((390 - 60) / 4);
  expect(((58 * course.markerScale) / course.length) * 1.2).toBeCloseTo(0.3);
});

it("keeps past you visible without ranking it and supports continuous horizontal exploration",()=>{
 const s=portraitField(lanes.map(l=>l.ghost?{...l,value:11}:l),{center:10,span:20},undefined,.4);
 expect(s.markers.some(m=>m.ghost)).toBe(true);expect(s.fieldSize).toBe(3);expect(s.focus-s.baseFocus).toBeCloseTo(.4);
 expect(s.markers.every(m=>m.trail.includes("L"))).toBe(true);expect(JSON.stringify(s.ground)).toContain("Q");
});

it("projects survey lines and athletes through the same invertible distance plane", () => {
  const view = { center: 10, span: 4 };
  const scene = portraitField(lanes, view);
  for (const marker of scene.markers) {
    expect(view.center + view.span / 2 - portraitDepthAt(marker.y) * view.span).toBeCloseTo(marker.value);
  }
  for (const tick of scene.ticks) {
    expect(view.center + view.span / 2 - portraitDepthAt(tick.y) * view.span).toBeCloseTo(tick.value);
  }
  expect(scene.markers.some(m => m.ghost)).toBe(false);
  expect(scene.outside.some(m => m.ghost)).toBe(true);
});

it("omits start trails when the start line is outside the distance window", () => {
  const scene = portraitField(lanes, { center: 8, span: 4 });
  expect(scene.markers.find((m) => m.you)?.trail).toBe("");
});

it("continues a bounded field to a fixed horizon across pan, zoom and roster sizes", () => {
  const a = portraitField(lanes, { center: 10, span: 1.2 });
  const b = portraitField(Array.from({ length: 200 }, (_, i) => ({ id: `p${i}`, name: "Peer", initials: "P", value: i })), { center: 80, span: 40 }, undefined, 5.5);
  const groundA = a.ground[1]!.children!;
  const groundB = b.ground[1]!.children!;
  const raysA = groundA.filter(node => String(node.attrs.d).startsWith("M210,148"));
  const raysB = groundB.filter(node => String(node.attrs.d).startsWith("M210,148"));
  expect(raysA.length).toBeGreaterThan(30);
  expect(raysB.length).toBeLessThanOrEqual(36);
  expect(raysA.every(node => parseFloat(String(node.attrs.d).split(",")[2]!) > 600)).toBe(true);
  expect(JSON.stringify(b.ground)).not.toMatch(/NaN|Infinity/);
});
