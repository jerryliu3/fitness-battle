import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PortraitField } from "./portrait-field";
it("renders real portraits, relative gaps and in-board controls without requiring WebGL", () => {
  const html = renderToStaticMarkup(
    createElement(PortraitField, {
      lanes: [
        {
          id: "you",
          you: true,
          name: "Alex",
          initials: "A",
          avatarUrl: "https://example.com/alex.jpg",
          value: 10,
        },
        { id: "peer", name: "Maya", initials: "M", value: 10.2 },
      ],
      view: { center: 10, span: 1.2 },
      unit: "km",
      onZoom: () => {},
      onPan: () => {},
      onSelect: () => {},
    }),
  );
  expect(html).toContain("alex.jpg");
  expect(html).toContain("+0.20 km");
  expect(html).toContain('aria-label="Zoom in"');
  expect(html).toContain('aria-label="Next lane"');
  expect(html).toContain("YOU");
  expect(html).toContain("Distance perspective field");
  expect(html).not.toContain("canvas");
});
