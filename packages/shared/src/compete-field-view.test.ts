import { describe, expect, it } from "vitest";
import {
  allowedCompeteFieldViews,
  competeFieldSwitcherOptions,
  defaultCompeteFieldView,
  isGeographicCompete,
  isMetricCompete,
  normalizeCompeteFieldView,
  fieldZoomLimits,
  arenaValueDecimals,
  arenaLaneValues,
  competeVolumeFromTotals,
  isGeographicArenaUnit,
} from "./compete-field-view";
import type { CheckpointSeries } from "./compete/track";

describe("competeFieldView", () => {
  it("treats GPS sports as geographic with map default", () => {
    expect(isGeographicCompete("running")).toBe(true);
    expect(isMetricCompete("cycling")).toBe(false);
    expect(defaultCompeteFieldView("running")).toBe("4d");
    expect(allowedCompeteFieldViews("cycling")).toEqual(["4d", "2d", "graph"]);
  });

  it("treats metric events as chart-first without map", () => {
    for (const event of ["strength", "walking"] as const) {
      expect(isMetricCompete(event)).toBe(true);
      expect(defaultCompeteFieldView(event)).toBe("graph");
      expect(allowedCompeteFieldViews(event)).toEqual(["graph", "2d"]);
    }
  });

  it("keeps Recovery chart-only in both policy and menu", () => {
    expect(competeFieldSwitcherOptions("sleep")).toEqual([{ value: "graph", label: "Timeline" }]);
    expect(normalizeCompeteFieldView("sleep", "2d")).toBe("graph");
    expect(normalizeCompeteFieldView("sleep", "3d")).toBe("graph");
  });

  it("maps checkpoint series to hrs, steps, or distance lanes", () => {
    const series: CheckpointSeries = {
      effort: [100, 200, 400],
      distanceM: [0, 0, 0],
      movingSec: [1800, 3600, 7200],
      labels: ["Early", "Mid", "Now"],
      liveAt: new Date("2026-10-26T18:00:00Z"),
    };
    expect(competeVolumeFromTotals("strength", { effort: 4, distanceM: 0, movingSec: 3600 }, "metric")).toBe(1);
    expect(competeVolumeFromTotals("walking", { effort: 500, distanceM: 0, movingSec: 0 }, "metric")).toBe(500);
    expect(arenaLaneValues("strength", series, "metric")).toEqual([0.5, 1, 2]);
    expect(arenaLaneValues("walking", series, "metric")).toEqual([100, 200, 400]);
  });

  it("exposes arena unit helpers for lane zoom and formatting", () => {
    expect(isGeographicArenaUnit("km")).toBe(true);
    expect(isGeographicArenaUnit("hrs")).toBe(false);
    expect(fieldZoomLimits("steps")).toEqual({ min: 500, max: 40_000 });
    expect(arenaValueDecimals("steps")).toBe(0);
    expect(arenaValueDecimals("hrs")).toBe(1);
  });

  it("normalizes illegal views for the presentation kind", () => {
    expect(normalizeCompeteFieldView("strength", "4d")).toBe("graph");
    expect(normalizeCompeteFieldView("strength", "2d")).toBe("2d");
    expect(normalizeCompeteFieldView("running", "4d")).toBe("4d");
    expect(normalizeCompeteFieldView("running", "graph")).toBe("graph");
    expect(normalizeCompeteFieldView("cycling", "3d")).toBe("2d");
  });
});