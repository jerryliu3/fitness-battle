import { describe, expect, it } from "vitest";
import { indexCompetitionReplay, type CompetitionReplay } from "./competition-replay";
import { competitionActivityLog } from "./competition-activity-log";

const replay: CompetitionReplay = {
  sport: "running", track: "verified", periodStart: "2026-11-02T11:00:00Z", periodEnd: "2026-11-09T05:00:00Z", through: "2026-11-08T20:00:00Z", scope: "field",
  athletes: [{ id: "you", name: "Alex", you: true }, { id: "peer", name: "Riley", you: false }, { id: "third", name: "Jordan", you: false }],
  events: [
    { id: "1", athleteId: "you", at: "2026-11-03T12:00:00Z", distanceM: 1000, movingSec: 300, effort: 1 },
    { id: "2", athleteId: "peer", at: "2026-11-04T12:00:00Z", distanceM: 1000, movingSec: 300, effort: 1, simulated: true },
    { id: "3", athleteId: "third", at: "2026-11-05T12:00:00Z", distanceM: 500, movingSec: 150, effort: 0.5 },
  ],
};

describe("competition activity feed", () => {
  it("keeps every counted event, newest first, without claiming an outright lead on ties", () => {
    const rows = competitionActivityLog(indexCompetitionReplay(replay, "metric"));
    expect(rows.map(row => row.id)).toEqual(["third:3", "peer:2", "you:1"]);
    expect(rows[1]).toMatchObject({ title: "Riley moved to place 1", detail: "+1 km · Place 2 → 1", simulated: true });
    expect(rows[2]?.title).toBe("You logged +1 km");
  });
  it("hides blocked activity without changing the field's places", () => {
    const rows = competitionActivityLog(indexCompetitionReplay(replay, "metric"), ["peer"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.detail).toBe("Place 3");
    expect(JSON.stringify(rows)).not.toContain("Riley");
  });
  it("reuses replay validation and metric conversion without generating extra events", () => {
    const invalid = { ...replay.events[0]!, id: "late", at: replay.periodEnd };
    const index = indexCompetitionReplay({ ...replay, events: [...replay.events, replay.events[0]!, invalid] }, "us");
    const rows = competitionActivityLog(index);
    expect(rows).toHaveLength(3);
    expect(rows[2]?.title).toBe("You logged +0.62 mi");
  });
  it("shows strength effort points, rather than inventing lift weights", () => {
    const index = indexCompetitionReplay({ ...replay, sport: "strength", track: "open", events: [{ ...replay.events[0]!, distanceM: 0, effort: 4, movingSec: 1800 }] }, "metric");
    expect(competitionActivityLog(index)[0]?.title).toBe("You logged +4 pts");
  });
});
