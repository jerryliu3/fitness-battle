import { expect, it } from "vitest";
import { recordedRaceBenchmarkSeconds } from "./pace";
import type { Activity } from "./sports";

it("compares a scaled recorded run and excludes ineligible or synthetic activity", () => {
  const run: Activity = {
    id: "run",
    sport: "running",
    startedAt: "2026-11-15T12:00:00Z",
    distanceM: 10000,
    movingSec: 2700,
    verified: true,
    source: "strava",
    avgHr: null,
  };
  const faster = { ...run, movingSec: 2000 };
  expect(recordedRaceBenchmarkSeconds({ activities: [
    run,
    { ...faster, provenance: "demo" },
    { ...faster, verified: false },
    { ...faster, source: "history" },
    { ...faster, disposition: "excluded" },
    { ...faster, distanceM: 4999 },
  ] }, 5000)).toBe(1350);
  expect(recordedRaceBenchmarkSeconds({ activities: [run] }, 21097)).toBeNull();
});
