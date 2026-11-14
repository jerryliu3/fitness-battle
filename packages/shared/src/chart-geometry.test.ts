import { describe, expect, it } from "vitest";
import { buildStandardChartGeometry, dottedCircleDasharray } from "./chart-geometry";

describe("buildStandardChartGeometry", () => {
  it("handles empty arrays gracefully", () => {
    const geo = buildStandardChartGeometry([]);
    expect(geo.points).toHaveLength(0);
    expect(geo.polyline).toBe("");
    expect(geo.polylines).toEqual([]);
    expect(geo.areaPath).toBe("");
  });

  it("calculates aligned x, y coordinates and axis ticks for regular series", () => {
    const geo = buildStandardChartGeometry([50, 75, 100], 340, 150);
    expect(geo.points).toHaveLength(3);
    expect(geo.xStart).toBe(44);
    expect(geo.xEnd).toBe(326);
    expect(geo.points[0]!.x).toBe(44);
    expect(geo.points[2]!.x).toBe(326);
    expect(geo.yMin).toBeLessThan(50);
    expect(geo.yMax).toBeGreaterThan(100);
    expect(geo.yMid).toBeCloseTo((geo.yMin + geo.yMax) / 2, 0.5);
    expect(geo.polyline).toContain("44.0");
    expect(geo.trendPolyline).toContain("44.0");
    expect(geo.areaPath).toContain("Z");
  });

  it("handles constant values without division by zero", () => {
    const geo = buildStandardChartGeometry([60, 60, 60], 340, 150);
    expect(geo.points).toHaveLength(3);
    expect(geo.yMin).toBeLessThan(60);
    expect(geo.yMax).toBeGreaterThan(60);
    expect(Number.isFinite(geo.points[0]!.y)).toBe(true);
  });

  it("generates closed corridor path and boundary polylines when corridor bounds provided", () => {
    const geo = buildStandardChartGeometry([50, 60], 340, 150, {
      high: [65, 75],
      low: [40, 45],
    });
    expect(geo.corridorPath).toBeDefined();
    expect(geo.corridorPath).toContain("M ");
    expect(geo.corridorPath).toContain(" Z");
    expect(geo.corridorHighPolyline).toBeDefined();
    expect(geo.corridorLowPolyline).toBeDefined();
    expect(geo.corridorHighPolyline).toContain(",");
    expect(geo.corridorLowPolyline).toContain(",");
    expect(geo.trendPolyline).toBe("");
  });

  it("clamps yMin to 0 for non-negative series by default", () => {
    const geo = buildStandardChartGeometry([0, 50, 190], 340, 150);
    expect(geo.yMin).toBe(0);
  });
});

it("places a rounded middle tick using the same Y scale as its value", () => {
  const geo = buildStandardChartGeometry([.11, .98], 340, 151);
  const expected = geo.yBottom - (geo.yMid - geo.yMin) / (geo.yMax - geo.yMin) * (geo.yBottom - geo.yTop);
  expect(geo.yMidPos).toBe(expected);
});

it("keeps calendar spacing and breaks the line across missing days", () => {
  const geo = buildStandardChartGeometry([50, null, 100], 340, 150);
  expect(geo.points).toHaveLength(2);
  expect(geo.points[0]!.index).toBe(0);
  expect(geo.points[1]!.index).toBe(2);
  expect(geo.points[1]!.x).toBe(geo.xEnd);
  expect(geo.points[0]!.x).toBe(geo.xStart);
  expect(geo.polylines).toHaveLength(0);
  const connected = buildStandardChartGeometry([50, null, 75, 100], 340, 150);
  expect(connected.polylines).toHaveLength(1);
  expect(connected.points[1]!.x - connected.points[0]!.x).toBeGreaterThan(
    (connected.xEnd - connected.xStart) / 3,
  );
});

it("produces 8 even dashes around any radius and 3-4 round-number yTicks", () => {
  expect(dottedCircleDasharray(4, 8)).toBe("1.57 1.57");
  const geo = buildStandardChartGeometry([47, 86], 340, 150);
  expect(geo.yTicks.length).toBeGreaterThanOrEqual(3);
  expect(geo.yTicks.length).toBeLessThanOrEqual(4);
  expect(geo.yTicks[0]!.value).toBeLessThanOrEqual(47);
  expect(geo.yTicks.at(-1)!.value).toBeGreaterThanOrEqual(86);
  expect(geo.yTicks.every((t) => Number.isInteger(t.value))).toBe(true);
});
