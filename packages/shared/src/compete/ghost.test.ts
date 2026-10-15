import { describe, expect, it } from "vitest";
import {
  alignedGhostNow,
  ghostDisplayName,
  ghostEffortAt,
  ghostHasVolume,
  resolveGhostPeriodBounds,
  resolvePastSelfGhost,
  shiftedPeriodBounds,
} from "./ghost";
import type { Activity } from "./sports";

const currentStart = new Date("2026-10-12T00:00:00.000Z");
const currentEnd = new Date("2026-10-19T00:00:00.000Z");

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

describe("shiftedPeriodBounds / resolveGhostPeriodBounds", () => {
  it("shifts the current window back by equal spans", () => {
    const prior = shiftedPeriodBounds(currentStart, currentEnd, 1);
    expect(prior.startsAt.toISOString()).toBe("2026-10-05T00:00:00.000Z");
    expect(prior.endsAt.toISOString()).toBe("2026-10-12T00:00:00.000Z");

    const twoAgo = shiftedPeriodBounds(currentStart, currentEnd, 2);
    expect(twoAgo.startsAt.toISOString()).toBe("2026-09-28T00:00:00.000Z");
    expect(twoAgo.endsAt.toISOString()).toBe("2026-10-05T00:00:00.000Z");
  });

  it("accepts arbitrary bounds selectors", () => {
    const bounds = resolveGhostPeriodBounds(currentStart, currentEnd, {
      mode: "bounds",
      startsAt: new Date("2026-09-01T00:00:00.000Z"),
      endsAt: new Date("2026-09-08T00:00:00.000Z"),
    });
    expect(bounds.startsAt.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(bounds.selector.mode).toBe("bounds");
  });
});

describe("ghostDisplayName", () => {
  it("labels the default previous week and deeper offsets", () => {
    expect(
      ghostDisplayName({ mode: "prior", periodsAgo: 1 }, "weekly"),
    ).toEqual({ name: "Your previous week", initials: "PW" });
    expect(
      ghostDisplayName({ mode: "prior", periodsAgo: 3 }, "weekly"),
    ).toEqual({ name: "3 weeks ago", initials: "P3" });
    expect(
      ghostDisplayName({ mode: "prior", periodsAgo: 1 }, "daily"),
    ).toEqual({ name: "Your previous day", initials: "PD" });
  });
});

describe("resolvePastSelfGhost", () => {
  it("builds a same-cutoff past-self series from the previous week", () => {
    const activities = [
      activity("2026-10-05", 4000, 1200),
      activity("2026-10-07", 6000, 1800),
      activity("2026-10-09", 5000, 1500),
      activity("2026-10-13", 7000, 2100),
    ];
    const liveAt = new Date("2026-10-16T15:00:00.000Z");
    const ghost = resolvePastSelfGhost({
      activities,
      sport: "running",
      track: "open",
      currentStart,
      currentEnd,
      currentLiveAt: liveAt,
    });

    expect(ghost.subject).toBe("past_self");
    expect(ghost.inStandings).toBe(false);
    expect(ghost.name).toBe("Your previous week");
    expect(ghost.periodStart.toISOString()).toBe("2026-10-05T00:00:00.000Z");
    expect(ghostHasVolume(ghost)).toBe(true);
    expect(ghost.series!.distanceM[2]).toBe(15000);
    expect(ghostEffortAt(ghost, 2)).toBe(ghost.series!.effort[2]);
  });

  it("resolves an arbitrary past window via bounds selector", () => {
    const activities = [activity("2026-09-02", 8000, 2400)];
    const ghost = resolvePastSelfGhost({
      activities,
      sport: "running",
      track: "open",
      currentStart,
      currentEnd,
      currentLiveAt: new Date("2026-10-14T12:00:00.000Z"),
      selector: {
        mode: "bounds",
        startsAt: new Date("2026-09-01T00:00:00.000Z"),
        endsAt: new Date("2026-09-08T00:00:00.000Z"),
      },
    });
    expect(ghost.periodStart.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(ghost.name).toContain("Past you");
    expect(ghostHasVolume(ghost)).toBe(true);
  });

  it("returns a null series when the ghost window has no effort", () => {
    const ghost = resolvePastSelfGhost({
      activities: [activity("2026-10-13", 5000, 1500)],
      sport: "running",
      track: "open",
      currentStart,
      currentEnd,
      currentLiveAt: new Date("2026-10-14T12:00:00.000Z"),
    });
    expect(ghostHasVolume(ghost)).toBe(false);
    expect(ghostEffortAt(ghost, 1)).toBe(0);
  });

  it("aligns ghost now to the same elapsed offset as the live week", () => {
    const liveAt = new Date("2026-10-16T15:00:00.000Z");
    const aligned = alignedGhostNow(
      new Date("2026-10-05T00:00:00.000Z"),
      currentStart,
      liveAt,
    );
    expect(aligned.toISOString()).toBe("2026-10-09T15:00:00.000Z");
  });
});
