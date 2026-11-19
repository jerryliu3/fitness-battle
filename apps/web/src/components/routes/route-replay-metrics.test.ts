import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteReplayMetrics } from "./route-replay-metrics";

const channels = { speed: true, heartRate: true, cadence: true };
const sample = { progress: .5, elapsedSec: 119.9, speedMps: 5, heartRate: 140, cadence: 172, cadenceUnit: "spm" as const };

it("renders recorded values and uses running pace or cycling speed in athlete units", () => {
  const running = renderToStaticMarkup(createElement(RouteReplayMetrics, { sample, channels, running: true, units: "metric" }));
  expect(running).toContain("3:20 /km");
  expect(running).toContain("140 bpm");
  expect(running).toContain("172 spm");
  expect(running).toContain("1:59");
  const cycling = renderToStaticMarkup(createElement(RouteReplayMetrics, { sample, channels, running: false, units: "us" }));
  expect(cycling).toContain("11.2 mph");
});

it("keeps gaps visible for available channels and omits absent sensors", () => {
  const gap = renderToStaticMarkup(createElement(RouteReplayMetrics, {
    sample: null, channels: { ...channels, cadence: false, heartRate: false }, running: true, units: "metric",
  }));
  expect(gap).toContain("—");
  expect(gap).toContain("Pace");
  expect(gap).not.toContain("Cadence");
  expect(gap).not.toContain("Heart rate");
});
