import { describe, expect, it } from "vitest";
import { freshState, reduceCompete } from "../compete";
import { phoneTabFromPath } from "./tabs";
import { readWeekVisit, visitGain, weekVisit } from "./visit";

const NOW = "2026-10-14T18:00:00.000Z";

function counted(id: string, day: string, km: number) {
  return reduceCompete(freshState(new Date(NOW)), {
    type: "apply-sync",
    provider: "strava",
    linkStatus: "connected",
    now: NOW,
    activities: [
      {
        id,
        sport: "running",
        startedAt: `2026-10-${day}T07:30:00.000Z`,
        distanceM: km * 1000,
        movingSec: 30 * 60,
        avgHr: 140,
        verified: true,
        source: "strava",
        provenance: "imported",
        disposition: "counted",
      },
    ],
  });
}

describe("week visit", () => {
  it("treats a longer counted run in the same week as a gain", () => {
    const before = counted("mon", "12", 4);
    const after = reduceCompete(before, {
      type: "apply-sync",
      provider: "strava",
      linkStatus: "connected",
      now: NOW,
      activities: [
        {
          id: "wed",
          sport: "running",
          startedAt: "2026-10-14T07:30:00.000Z",
          distanceM: 5100,
          movingSec: 34 * 60,
          avgHr: 142,
          verified: true,
          source: "strava",
          provenance: "imported",
          disposition: "counted",
        },
      ],
    });
    const gain = visitGain(weekVisit(before), weekVisit(after));
    expect(gain).not.toBeNull();
    expect(gain!.distanceM).toBeGreaterThan(0);
    expect(gain!.newActivities).toBe(1);
  });

  it("ignores a repeat sync", () => {
    const state = counted("mon", "12", 4);
    expect(visitGain(weekVisit(state), weekVisit(state))).toBeNull();
  });

  it("rejects a stored visit that is not the shape we write", () => {
    expect(readWeekVisit("{\"version\":1}")).toBeNull();
    const visit = weekVisit(counted("mon", "12", 4));
    expect(readWeekVisit(JSON.stringify(visit))?.scope).toBe(visit.scope);
  });
});

describe("phone tabs", () => {
  it("keeps history routes on You", () => {
    expect(phoneTabFromPath("/")).toBe("today");
    expect(phoneTabFromPath("/board")).toBe("arena");
    expect(phoneTabFromPath("/field")).toBe("field");
    expect(phoneTabFromPath("/progress")).toBe("you");
  });
});
