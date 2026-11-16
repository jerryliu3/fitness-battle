import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { formatEffort, type BoardRow } from "@fitness-battle/shared";
import { WeekRecords } from "./athlete-card";

it("separates native event volume from the official Effort Score", () => {
  const you: BoardRow = { id: "you", name: "Alex", you: true, place: 1,
    effort: 3600, movingSec: 3600, distanceM: 0, elo: 1250 };
  const html = renderToStaticMarkup(createElement(WeekRecords, { sport: "strength", you, fieldSize: 8 }));
  expect(html).toContain("1.0 hrs");
  expect(html).toContain(`Effort score</span><strong>${formatEffort(1250)}`);
  expect(html).not.toContain(`Effort score</span><strong>${formatEffort(3600)}`);
});
