import { describe, expect, it } from "vitest";
import {
  ANALYTICS_DOMAIN_IDS,
  ANALYTICS_DOMAIN_SPECS,
  ANALYTICS_LAYOUT_MODES,
  ANALYTICS_SCENARIO_IDS,
  ANALYTICS_TIME_LENSES,
  MOBILE_LAYOUT_SPECS,
  buildAnalyticsLabModel,
  buildSvgCorridorGeometry,
  buildSvgLineGeometry,
  deriveScenarioFromCompeteState,
  formatMinutesAsHoursMins,
  getDomainTitle,
} from "./analytics-lab";
import type { CompeteState } from "./compete/sports";

describe("analytics-lab shared model", () => {
  it("defines 6 core domains with 3 visual concepts each and 3 mobile native layout modes", () => {
    expect(ANALYTICS_DOMAIN_SPECS).toHaveLength(ANALYTICS_DOMAIN_IDS.length);
    for (const domain of ANALYTICS_DOMAIN_SPECS) {
      expect(domain.concepts).toHaveLength(3);
      expect(domain.concepts.map((c) => c.index)).toEqual([0, 1, 2]);
    }
    expect(MOBILE_LAYOUT_SPECS).toHaveLength(ANALYTICS_LAYOUT_MODES.length);
  });

  it("computes SVG line and corridor geometry", () => {
    expect(ANALYTICS_DOMAIN_IDS).toHaveLength(6);
    const lineGeo = buildSvgLineGeometry([10, 20, 15, 30], 100, 50);
    expect(lineGeo.points).toHaveLength(4);
    expect(lineGeo.polyline).toContain(",");
    expect(lineGeo.areaPath).toContain("M");

    const corridorGeo = buildSvgCorridorGeometry(
      [
        { value: 60, baselineLow: 50, baselineHigh: 70 },
        { value: 65, baselineLow: 52, baselineHigh: 72 },
      ],
      100,
      50,
    );
    expect(corridorGeo.points).toHaveLength(2);
    expect(corridorGeo.corridorPath).toContain("M");
  });

  it("computes deterministic market, vitals, sleep, load, performance, and combined series across scenarios and lenses", () => {
    const m7d = buildAnalyticsLabModel("peak_build", "7d");
    const m30d = buildAnalyticsLabModel("peak_build", "30d");
    expect(m7d.vitals.metrics[0]!.series).toHaveLength(7);
    expect(m30d.vitals.metrics[0]!.series).toHaveLength(30);
    expect(m7d.sleep.nights).toHaveLength(7);
    expect(m30d.sleep.nights).toHaveLength(30);

    for (const scenario of ANALYTICS_SCENARIO_IDS) {
      for (const lens of ANALYTICS_TIME_LENSES) {
        const model = buildAnalyticsLabModel(scenario, lens);
        expect(model.scenario).toBe(scenario);
        expect(model.timeLens).toBe(lens);
        expect(model.market.equitySeries.length).toBeGreaterThan(0);
        expect(model.market.candles.length).toBeGreaterThan(0);
        expect(model.market.holdings).toHaveLength(4);
        expect(model.vitals.metrics).toHaveLength(6);
        expect(model.sleep.nights.length).toBeGreaterThan(0);
        expect(model.load.series.length).toBeGreaterThan(0);
        expect(model.performance.zones).toHaveLength(5);
        expect(model.combined.series.length).toBeGreaterThan(0);
      }
    }
  });

  it("distinguishes peak_build from overreaching in vitals anomalies and ACWR load", () => {
    const peak = buildAnalyticsLabModel("peak_build", "30d");
    const over = buildAnalyticsLabModel("overreaching", "30d");

    expect(peak.vitals.readinessComposite).toBeGreaterThan(over.vitals.readinessComposite);
    expect(over.vitals.anomalyCount).toBeGreaterThan(peak.vitals.anomalyCount);
    expect(over.load.acwrCurrent).toBeGreaterThan(1.3);
    expect(peak.load.acwrCurrent).toBeLessThanOrEqual(1.3);
  });

  it("derives scenario and holdings adaptively from account CompeteState", () => {
    // 1. Sparse state when uncalibrated or fewer than 4 activities
    const sparseState = {
      calibrated: false,
      activities: [],
      readiness: [],
      sleepNights: [],
    } as unknown as CompeteState;
    expect(deriveScenarioFromCompeteState(sparseState)).toBe("sparse_new");
    const sparseModel = buildAnalyticsLabModel(sparseState, "30d");
    expect(sparseModel.scenario).toBe("sparse_new");

    // 2. Overreaching state when recent readiness and sleep are suppressed
    const overState = {
      calibrated: true,
      activities: Array.from({ length: 10 }, (_, i) => ({
        id: `act-${i}`,
        sport: "running",
        startedAt: new Date(Date.now() - i * 86400000).toISOString(),
        movingSec: 3600,
      })),
      readiness: [{ id: "r1", score: 50 }, { id: "r2", score: 45 }],
      sleepNights: [{ id: "s1", score: 55 }, { id: "s2", score: 58 }],
    } as unknown as CompeteState;
    expect(deriveScenarioFromCompeteState(overState)).toBe("overreaching");
    const overModel = buildAnalyticsLabModel(overState, "30d");
    expect(overModel.scenario).toBe("overreaching");

    // 3. Peak build with real activities informing holdings
    const healthyState = {
      calibrated: true,
      activities: [
        { id: "a1", sport: "running", startedAt: new Date().toISOString(), movingSec: 7200 },
        { id: "a2", sport: "running", startedAt: new Date().toISOString(), movingSec: 7200 },
        { id: "a3", sport: "cycling", startedAt: new Date().toISOString(), movingSec: 3600 },
        { id: "a4", sport: "strength", startedAt: new Date().toISOString(), movingSec: 1800 },
      ],
      readiness: [{ id: "r1", score: 85 }],
      sleepNights: [{ id: "s1", score: 88 }],
    } as unknown as CompeteState;
    expect(deriveScenarioFromCompeteState(healthyState)).toBe("peak_build");
    const healthyModel = buildAnalyticsLabModel(healthyState, "30d");
    expect(healthyModel.scenario).toBe("peak_build");
    expect(healthyModel.market.holdings[0]!.sport).toBe("Running (GPS)");
    expect(healthyModel.market.holdings[0]!.hours).toBe(4);
  });

  it("formats domain titles and time durations", () => {
    expect(getDomainTitle("market")).toBe("Athlete Market");
    expect(getDomainTitle("vitals")).toBe("Autonomic Vitals");
    expect(getDomainTitle("sleep")).toBe("Sleep & Recovery");
    expect(getDomainTitle("load")).toBe("Workload Ratio");
    expect(getDomainTitle("performance")).toBe("Cardio & Pace");
    expect(getDomainTitle("combined")).toBe("Multi-Metric Synthesis");
    expect(getDomainTitle(null)).toBe("Athlete Telemetry");
    expect(formatMinutesAsHoursMins(125)).toBe("2h 05m");
  });
});
