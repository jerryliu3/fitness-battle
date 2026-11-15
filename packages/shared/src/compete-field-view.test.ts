import { describe, expect, it } from "vitest";
import {
  allowedCompeteFieldViews,
  defaultCompeteFieldView,
  isGeographicCompete,
  isMetricCompete,
  normalizeCompeteFieldView,
} from "./compete-field-view";

describe("competeFieldView", () => {
  it("treats GPS sports as geographic with map default", () => {
    expect(isGeographicCompete("running")).toBe(true);
    expect(isMetricCompete("cycling")).toBe(false);
    expect(defaultCompeteFieldView("running")).toBe("4d");
    expect(allowedCompeteFieldViews("cycling")).toEqual(["4d", "2d", "graph"]);
  });

  it("treats metric events as chart-first without map", () => {
    for (const event of ["strength", "walking", "sleep"] as const) {
      expect(isMetricCompete(event)).toBe(true);
      expect(defaultCompeteFieldView(event)).toBe("graph");
      expect(allowedCompeteFieldViews(event)).toEqual(["graph", "2d"]);
    }
  });

  it("normalizes illegal views for the presentation kind", () => {
    expect(normalizeCompeteFieldView("strength", "4d")).toBe("graph");
    expect(normalizeCompeteFieldView("strength", "2d")).toBe("2d");
    expect(normalizeCompeteFieldView("running", "4d")).toBe("4d");
    expect(normalizeCompeteFieldView("running", "graph")).toBe("graph");
    expect(normalizeCompeteFieldView("cycling", "3d")).toBe("2d");
  });
});