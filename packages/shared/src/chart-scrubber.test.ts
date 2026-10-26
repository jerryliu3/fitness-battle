import { expect, it } from "vitest";
import { chartClientXToModel, nearestChartDatum } from "./chart-scrubber";

it("maps client X into chart model coordinates", () => {
  expect(chartClientXToModel(50, { left: 0, width: 100 }, 340)).toBe(170);
  expect(chartClientXToModel(0, { left: 10, width: 100 }, 340)).toBe(0);
  expect(chartClientXToModel(200, { left: 10, width: 100 }, 340)).toBe(340);
});

it("picks the nearest inspection point by model X", () => {
  const points = [
    { id: "a", x: 10, y: 0, label: "Mon", value: "1 hr" },
    { id: "b", x: 50, y: 0, label: "Tue", value: "2 hr" },
  ];
  expect(nearestChartDatum(points, 48)?.id).toBe("b");
});
