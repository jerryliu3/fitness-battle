import { describe, expect, it } from "vitest";
import {
  parseVitalsLabSceneMessage,
  vitalsLabMetricsFromModel,
  vitalsLabSystemToHealth,
} from "./vitals-lab-body";
import { buildAnalyticsLabModel } from "./analytics-lab";

describe("vitals-lab-body", () => {
  it("maps system pills to renderer health systems", () => {
    expect(vitalsLabSystemToHealth("heart")).toBe("cardiovascular");
    expect(vitalsLabSystemToHealth("breathing")).toBe("respiratory");
    expect(vitalsLabSystemToHealth("movement")).toBe("movement");
    expect(vitalsLabSystemToHealth("full")).toBe("full");
  });

  it("builds six flank metrics from analytics model", () => {
    const model = buildAnalyticsLabModel("peak_build", "30d");
    const metrics = vitalsLabMetricsFromModel(model);
    expect(metrics).toHaveLength(6);
    expect(metrics.some((m) => m.id === "hrv" && m.value.length > 0)).toBe(true);
  });

  it("parses vitals lab WebView bridge messages", () => {
    const msg = parseVitalsLabSceneMessage({
      type: "vitals-lab",
      appearance: "dark",
      sex: "female",
      vizMode: "cloud",
      system: "heart",
      metricId: "hrv",
      view: "side",
      scanGeneration: 2,
      autoOrbit: true,
    });
    expect(msg?.sex).toBe("female");
    expect(msg?.metricId).toBe("hrv");
    expect(msg?.autoOrbit).toBe(true);
  });
});
