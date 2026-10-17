import { describe, expect, it } from "vitest";
import {
  activityCheckpoints,
  athleteWeekDistanceM,
  checkpointInstants,
  checkpointLabels,
  distanceTrackMaxKm,
  effortTrackMax,
  initialsFromName,
  interpolateSeries,
  selfLaneLabel,
  syntheticCheckpoints,
} from "./track";
import type { Activity } from "./sports";

const periodStart = new Date("2026-10-12T04:00:00.000Z");
const periodEnd = new Date("2026-10-19T04:00:00.000Z");

function activity(
  day: string,
  distanceM: number,
  movingSec: number,
): Activity {
  return {
    id: `a-${day}`,
    sport: "running",
    startedAt: `${day}T12:00:00.000Z`,
    distanceM,
    movingSec,
    avgHr: 140,
    verified: true,
    source: "strava",
  };
}

describe("checkpointInstants", () => {
  it("clamps the live cutoff into the period", () => {
    const [early, mid, live] = checkpointInstants(
      periodStart,
      periodEnd,
      new Date("2026-10-16T15:00:00.000Z"),
    );
    expect(early.getTime()).toBeLessThanOrEqual(mid.getTime());
    expect(mid.getTime()).toBeLessThanOrEqual(live.getTime());
    expect(live.toISOString()).toBe("2026-10-16T15:00:00.000Z");
  });
});

describe("checkpointLabels", () => {
  it("formats weekday names in America/New_York including Sunday night ET", () => {
    // Sunday 11:30 PM EDT (Oct 19 03:30 UTC) should be labeled "Sun"
    const labels = checkpointLabels([
      new Date("2026-10-12T15:00:00.000Z"),
      new Date("2026-10-15T15:00:00.000Z"),
      new Date("2026-10-19T03:30:00.000Z"),
    ]);
    expect(labels).toEqual(["Mon", "Thu", "Sun"]);
  });
});

describe("activityCheckpoints", () => {
  it("accumulates effort and distance through each cutoff", () => {
    const activities = [
      activity("2026-10-12", 5000, 1500),
      activity("2026-10-14", 8000, 2400),
      activity("2026-10-16", 6200, 1900),
    ];
    const series = activityCheckpoints(
      activities,
      "running",
      periodStart,
      periodEnd,
      "open",
      new Date("2026-10-16T18:00:00.000Z"),
    );
    expect(series.distanceM[0]).toBe(5000);
    expect(series.distanceM[1]).toBe(13000);
    expect(series.distanceM[2]).toBe(19200);
    expect(series.effort[2]).toBeGreaterThan(series.effort[1]!);
    expect(series.labels).toHaveLength(3);
    expect(new Set(series.labels).size).toBe(3);
  });

  it("names early-week cutoffs when they share a weekday", () => {
    const series = activityCheckpoints(
      [],
      "running",
      new Date("2026-10-13T04:00:00.000Z"),
      new Date("2026-10-18T04:00:00.000Z"),
      "open",
      new Date("2026-10-13T10:00:00.000Z"),
    );
    expect(series.labels).toEqual(["Early", "Mid", "Now"]);
  });
});

describe("syntheticCheckpoints", () => {
  it("ends on the full total and grows monotonically", () => {
    const series = syntheticCheckpoints(
      20,
      20000,
      6000,
      "running:maya",
      periodStart,
      periodEnd,
      new Date("2026-10-16T12:00:00.000Z"),
    );
    expect(series.effort[2]).toBe(20);
    expect(series.distanceM[2]).toBe(20000);
    expect(series.effort[0]!).toBeLessThan(series.effort[1]!);
    expect(series.effort[1]!).toBeLessThanOrEqual(series.effort[2]!);
  });
});

describe("athleteWeekDistanceM", () => {
  it("returns a positive GPS proxy for synthetic rivals", () => {
    const meters = athleteWeekDistanceM(
      { id: "running:0", name: "Maya Chen", city: "NYC", elo: 1100 },
      periodStart.toISOString(),
      "open",
      "running",
    );
    expect(meters).toBeGreaterThan(1000);
  });
});

describe("effortTrackMax / distanceTrackMaxKm", () => {
  it("pads above the field peak", () => {
    expect(effortTrackMax([12, 28, 41])).toBeGreaterThanOrEqual(60);
    expect(distanceTrackMaxKm([19.2, 25.2])).toBeGreaterThanOrEqual(30);
  });
});

describe("initialsFromName / interpolateSeries", () => {
  it("derives initials and interpolates checkpoints", () => {
    expect(initialsFromName("Maya Chen")).toBe("MC");
    expect(interpolateSeries([10, 20, 40], 1.5)).toBe(30);
  });
});

describe("selfLaneLabel", () => {
  it("labels unsigned guests as Guest and signed-in viewers as You", () => {
    expect(selfLaneLabel("Guest")).toBe("Guest");
    expect(selfLaneLabel("You")).toBe("You");
    expect(selfLaneLabel("Maya")).toBe("You");
    expect(selfLaneLabel("Guest", "caps")).toBe("GUEST");
    expect(selfLaneLabel("You", "caps")).toBe("YOU");
    expect(selfLaneLabel("Maya", "caps")).toBe("YOU");
  });
});
