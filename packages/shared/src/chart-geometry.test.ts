import { describe, expect, it } from "vitest";
import { buildStandardChartGeometry } from "./chart-geometry";

describe("buildStandardChartGeometry", () => {
  it("handles empty arrays gracefully", () => {
    const geo = buildStandardChartGeometry([]);
    expect(geo.points).toHaveLength(0);
    expect(geo.polyline).toBe("");
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
    expect(geo.areaPath).toContain("Z");
  });

  it("handles constant values without division by zero", () => {
    const geo = buildStandardChartGeometry([60, 60, 60], 340, 150);
    expect(geo.points).toHaveLength(3);
    expect(geo.yMin).toBeLessThan(60);
    expect(geo.yMax).toBeGreaterThan(60);
    expect(Number.isFinite(geo.points[0]!.y)).toBe(true);
  });

  it("generates closed corridor path when corridor bounds provided", () => {
    const geo = buildStandardChartGeometry([50, 60], 340, 150, {
      high: [65, 75],
      low: [40, 45],
    });
    expect(geo.corridorPath).toBeDefined();
    expect(geo.corridorPath).toContain("M ");
    expect(geo.corridorPath).toContain(" Z");
  });
});
