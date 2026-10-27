import { describe, expect, it } from "vitest";
import {
  ANALYTICS_DOMAIN_IDS,
  ANALYTICS_DOMAIN_SPECS,
  ANALYTICS_LAYOUT_MODES,
  ANALYTICS_SCENARIO_IDS,
  ANALYTICS_TIME_LENSES,
  MOBILE_LAYOUT_SPECS,
  buildAnalyticsLabModel,
} from "./analytics-lab";

describe("analytics-lab shared model", () => {
  it("defines 6 core domains with 3 visual concepts each and 3 mobile native layout modes", () => {
    expect(ANALYTICS_DOMAIN_SPECS).toHaveLength(ANALYTICS_DOMAIN_IDS.length);
    for (const domain of ANALYTICS_DOMAIN_SPECS) {
      expect(domain.concepts).toHaveLength(3);
      expect(domain.concepts.map((c) => c.index)).toEqual([0, 1, 2]);
    }
    expect(MOBILE_LAYOUT_SPECS).toHaveLength(ANALYTICS_LAYOUT_MODES.length);
  });

  it("computes deterministic market, vitals, sleep, load, performance, and combined series across scenarios and lenses", () => {
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
});
