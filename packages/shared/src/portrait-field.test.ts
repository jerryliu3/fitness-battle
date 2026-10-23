import { expect, it } from "vitest";
import { portraitField, portraitFieldGap } from "./portrait-field";
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
  expect(s.markers.find((m) => m.id === "a")?.outside).toBe(true);
  expect(s.markers.find((m) => m.id === "a")?.gap).toBe(2);
  expect(portraitFieldGap(null, "pts")).toContain("leading");
  expect(portraitFieldGap(2, "mi")).toBe("2 mi to next rival");
});
it("retains lane identity across overtakes, changes zoom depth and reaches every peer without free panning", () => {
  const a = portraitField(lanes, { center: 10, span: 10 });
  const b = portraitField(
    lanes.map((l) => ({ ...l, value: l.you ? 14 : l.value })),
    { center: 10, span: 2 },
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
  expect(course.laneWidth).toBeCloseTo((Math.max(390 - 60, 4 * 74) / 4) * 3);
  expect(((58 * course.markerScale) / course.length) * 1.2).toBeCloseTo(0.3);
});

it("keeps past you visible without ranking it and supports continuous horizontal exploration",()=>{
 const s=portraitField(lanes,{center:10,span:20},undefined,.4);
 expect(s.markers.some(m=>m.ghost)).toBe(true);expect(s.fieldSize).toBe(3);expect(s.focus-s.baseFocus).toBeCloseTo(.4);
 expect(s.markers.every(m=>m.trail.includes("Q"))).toBe(true);expect(JSON.stringify(s.ground)).toContain("Q");
});
