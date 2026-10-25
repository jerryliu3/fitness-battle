import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteControlsHud } from "./route-controls-hud";
const noop = () => {};
const props = { isPlaying: false, isFinished: false, progress: .5, currentDistanceKm: 1, totalDistanceKm: 2, mode: "2d-overview" as const, isRecordingVideo: false, onTogglePlay: noop, onReplay: noop, onSeek: noop, onToggleMode: noop, onExportVideo: noop, onSnapImage: noop };
it("displays recorded measurements with athlete units, including zero speed", () => {
  const metric = renderToStaticMarkup(createElement(RouteControlsHud, { ...props, hasReplaySamples: true, replaySample: { progress: .5, elapsedSec: 119.9, speedMps: 0, heartRate: 140, cadence: 172, cadenceUnit: "spm" } }));
  expect(metric).toContain("0.0 km/h"); expect(metric).toContain("140 bpm"); expect(metric).toContain("172 spm"); expect(metric).toContain("1:59");
  const imperial = renderToStaticMarkup(createElement(RouteControlsHud, { ...props, units: "us", hasReplaySamples: true, replaySample: { progress: .5, elapsedSec: 20, speedMps: 5 } }));
  expect(imperial).toContain("11.2 mph"); expect(imperial).not.toContain("undefined");
});
it("leaves sensor gaps unavailable and hides telemetry when no series exists", () => {
  const gap = renderToStaticMarkup(createElement(RouteControlsHud, { ...props, hasReplaySamples: true, replaySample: null }));
  expect(gap).toContain("—"); expect(gap).not.toContain("bpm");
  expect(renderToStaticMarkup(createElement(RouteControlsHud, props))).not.toContain("route-recorded-metrics");
});
