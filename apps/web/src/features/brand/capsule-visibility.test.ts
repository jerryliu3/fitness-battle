import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArenaLanes } from "@/features/focus/arena-lanes";

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");

function render(presentation: "lanes" | "standings", value = 3) {
  const markup = renderToStaticMarkup(createElement(ArenaLanes, {
    lanes: [{ id: "self", name: "Test athlete", initials: "TA", value, you: true }],
    presentation, view: { center: 3, span: 6 }, unit: "km", selected: "self",
    onSelect() {}, onPan() {},
  }));
  return markup.slice(markup.indexOf("<svg"), markup.lastIndexOf("</svg>")+6).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
}

async function goldPixels(svg: string, top: number, bottom: number) {
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let gold = 0;
  for (let y = top; y < Math.min(bottom, info.height); y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      if (data[i] > 200 && data[i + 1] > 140 && data[i + 1] < 230 && data[i + 2] < 110 && data[i + 3] > 100) gold++;
    }
  }
  return gold;
}

describe("production capsule visibility", () => {
  it.each([0, 3, 6])("renders the gold head at value %s, including field edges", async value => {
    expect(await goldPixels(render("lanes", value), 0, 540)).toBeGreaterThan(500);
  });
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
