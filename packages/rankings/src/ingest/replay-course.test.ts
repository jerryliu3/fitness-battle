import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  REPLAY_DISTANCE_METRES,
  buildReplayCoursePoints,
  parseGpxTrkpts,
  parseMapMyRunRouteHtml,
  replayCourseFromGpx,
} from "./replay-course";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures");

describe("replay course", () => {
  it("parses MapMyRun state and ends at half-marathon distance", () => {
    const html = readFileSync(join(fixtureDir, "mapmyrun-banff-half-snippet.html"), "utf8");
    const route = parseMapMyRunRouteHtml(html);
    expect(route.name).toContain("Banff");
    const points = buildReplayCoursePoints(
      route.points.map((row) => ({ lon: row.lon, lat: row.lat, metres: row.metres })),
      "half_marathon",
    );
    expect(points[0]![2]).toBe(0);
    expect(points.at(-1)![2]).toBe(REPLAY_DISTANCE_METRES.half_marathon);
    expect(points.length).toBeGreaterThan(100);
  });

  it("scales committed SF marathon GPX to 42.195 km", () => {
    const gpx = readFileSync(join(fixtureDir, "courses/sf-marathon-2026-full.gpx"), "utf8");
    const trkpts = parseGpxTrkpts(gpx);
    expect(trkpts.length).toBeGreaterThan(500);
    const points = replayCourseFromGpx(gpx, "marathon");
    expect(points.at(-1)![2]).toBe(REPLAY_DISTANCE_METRES.marathon);
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i]![2]).toBeGreaterThan(points[i - 1]![2]);
    }
  });
});