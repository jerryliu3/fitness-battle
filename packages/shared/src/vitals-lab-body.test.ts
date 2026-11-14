import { describe, expect, it } from "vitest";
import {
  parseVitalsLabCanvasMessage,
  vitalsLabMetricsFromCompeteState,
  vitalsLabMetricsFromModel,
  vitalsLabSystemToHealth,
} from "./vitals-lab-body";
import { buildAnalyticsLabModel } from "./analytics-lab";
import { freshState } from "./compete/engine";

describe("vitals-lab-body", () => {
  it("maps system pills to renderer health systems", () => {
    expect(vitalsLabSystemToHealth("heart")).toBe("cardiovascular");
    expect(vitalsLabSystemToHealth("breathing")).toBe("respiratory");
    expect(vitalsLabSystemToHealth("movement")).toBe("movement");
    expect(vitalsLabSystemToHealth("full")).toBe("full");
  });

  it("provides overnight baseline metrics with split Sleep parts by default", () => {
    const metrics = vitalsLabMetricsFromModel();
    expect(metrics).toHaveLength(6);
    const sleep = metrics.find((m) => m.id === "sleep");
    expect(sleep?.displayParts).toEqual([
      { num: "7", unit: "h " },
      { num: "42", unit: "m" },
    ]);
  });

  it("parses native canvas bridge messages", () => {
    const msg = parseVitalsLabCanvasMessage({
      type: "vitals-lab-canvas",
      appearance: "dark",
      gender: "male",
      viewMode: "lumen",
      activeMetric: "hrv",
      activeSystem: "heart",
      zoom: 1.5,
      panY: 0.2,
      targetRotY: 0.1,
      rotYStepNonce: 2,
      autoOrbit: false,
      scanNonce: 3,
      scanEnabled: true,
      anchor3D: { x: 0, y: 0.5, z: 0 },
      assetBaseUrl: "https://example.test",
    });
    expect(msg?.gender).toBe("male");
    expect(msg?.assetBaseUrl).toBe("https://example.test");
  });

  it("maps compete recordings to flank metrics without demo fallbacks", () => {
    const now = new Date("2026-10-25T12:00:00-04:00");
    const state = freshState(now);
    state.dailyHealth = [
      { provider: "oura", day: "2026-10-24", hrv: 64, restingHr: 52 },
    ];
    const empty = vitalsLabMetricsFromCompeteState(state, { now, signedOut: true });
    expect(empty.every((m) => m.value === "")).toBe(true);

    const metrics = vitalsLabMetricsFromCompeteState(state, { now });
    expect(metrics.find((m) => m.id === "hrv")?.value).toBe("64");
    expect(metrics.find((m) => m.id === "rhr")?.value).toBe("52");
    expect(metrics.find((m) => m.id === "resp")?.value).toBe("");
    expect(metrics.find((m) => m.id === "spo2")?.status).toBe("");
  });

  it("builds six flank metrics with physiological bounds from analytics model", () => {
    const model = buildAnalyticsLabModel("peak_build", "30d");
    const metrics = vitalsLabMetricsFromModel(model);
    expect(metrics).toHaveLength(6);
    const spo2 = Number(metrics.find((m) => m.id === "spo2")?.value);
    const rhr = Number(metrics.find((m) => m.id === "rhr")?.value);
    expect(spo2).toBeLessThanOrEqual(100);
    expect(rhr).toBeGreaterThanOrEqual(38);
  });
});
