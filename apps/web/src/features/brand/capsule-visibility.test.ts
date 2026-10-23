import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fieldCourse, defaultFieldAppearance } from "@fitness-battle/shared";
import { ArenaLanes } from "@/features/focus/arena-lanes";

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");

function render(presentation: "lanes" | "standings", value = 3, span = 6) {
  const markup = renderToStaticMarkup(createElement(ArenaLanes, {
    lanes: [{ id: "self", name: "Test athlete", initials: "TA", value, you: true }],
    presentation, view: { center: 3, span }, unit: "km", selected: "self",
    onSelect() {}, onPan() {},
  }));
  // The fixed distance scale is a sibling SVG. Extract the first complete tree,
  // retaining any nested Ember SVG instead of combining two root documents.
  const start = markup.indexOf("<svg");
  let depth = 0, end = start;
  for (const tag of markup.slice(start).matchAll(/<\/?svg\b[^>]*>/g)) {
    depth += tag[0].startsWith("</") ? -1 : 1;
    if (depth === 0) { end = start + tag.index! + tag[0].length; break; }
  }
  return markup.slice(start, end).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
}

async function goldPixels(svg: string, top: number, bottom: number, left = 0, right = Infinity) {
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let gold = 0;
  for (let y = Math.max(0, Math.floor(top)); y < Math.min(bottom, info.height); y++) {
    for (let x = Math.max(0, Math.floor(left)); x < Math.min(right, info.width); x++) {
      const i = (y * info.width + x) * 4;
      if (data[i] > 200 && data[i + 1] > 140 && data[i + 1] < 230 && data[i + 2] < 110 && data[i + 3] > 100) gold++;
    }
  }
  return gold;
}

describe("production capsule visibility", () => {
  it.each([0, 3, 6])("renders the gold head at value %s, including field edges", async value => {
    // A 300 m head is compact in a 6 km overview, but remains painted at either edge.
    const course = fieldCourse(360, 540, 1, { center: 3, span: 6 }, "km", defaultFieldAppearance);
    const head = course.point(value, 0, 0, true);
    // Inspect the local head bounds, excluding the earned trail far behind it.
    // A solid gold trail may legitimately fill thousands of pixels at the far edge.
    const pixels=await goldPixels(render("lanes", value), head.y - 35 * course.markerScale, head.y + 35 * course.markerScale,
      head.x - 32 * course.markerScale, head.x + 32 * course.markerScale);
    expect(pixels).toBeGreaterThan(100);
    expect(pixels).toBeLessThan(2000);
  });
  it("keeps the same world-size capsule legible at chase scale",async()=>{expect(await goldPixels(render("lanes",3,1.2),0,540)).toBeGreaterThan(500);});
  it("replaces an out-of-range capsule with a dotted arrow", () => {
    const svg = render("lanes", 8);
    expect(svg).not.toContain('data-polished-racer=');
    expect(svg).toContain('stroke-dasharray="3 3"');
    expect(svg).toContain("↑");
  });
  it("renders the standings capsule without a wake extending into the next row", async () => {
    const svg = render("standings");
    expect(await goldPixels(svg, 15, 78)).toBeGreaterThan(500);
    expect(await goldPixels(svg, 82, 160)).toBe(0);
  });
});
