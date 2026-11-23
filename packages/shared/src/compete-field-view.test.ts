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
  formatArenaValue,
  formatArenaVolume,
  isGeographicArenaUnit,
} from "./compete-field-view";
import type { CheckpointSeries } from "./compete/track";

describe("competeFieldView", () => {
  it("treats running, cycling, and walking as geographic with map default", () => {
    for (const event of ["running", "cycling", "walking"] as const) {
      expect(isGeographicCompete(event)).toBe(true);
      expect(isMetricCompete(event)).toBe(false);
      expect(defaultCompeteFieldView(event)).toBe("4d");
      expect(allowedCompeteFieldViews(event)).toEqual(["4d", "2d", "graph"]);
    }
  });

  it("treats strength and sleep as metric chart-first without map", () => {
    expect(isMetricCompete("strength")).toBe(true);
    expect(defaultCompeteFieldView("strength")).toBe("graph");
    expect(allowedCompeteFieldViews("strength")).toEqual(["graph", "2d"]);
    expect(allowedCompeteFieldViews("sleep")).toEqual(["graph"]);
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
    expect(formatArenaVolume("strength", { effort: 0, distanceM: 0, movingSec: 7200 }, "metric")).toBe("2 hrs");
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

  it("builds switcher options from presentation policy", () => {
    expect(competeFieldSwitcherOptions("strength").map((o) => o.value)).toEqual(["graph", "2d"]);
    expect(competeFieldSwitcherOptions("running").map((o) => o.value)).toEqual(["4d", "2d", "graph"]);
  });

  it("formats lane values with arena decimals", () => {
    expect(formatArenaValue(12_500, "steps")).toBe("12,500 steps");
    expect(formatArenaValue(2.5, "hrs")).toBe("2.5 hrs");
  });
});