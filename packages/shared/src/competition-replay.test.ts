import { describe, expect, it } from "vitest";
import { freshState } from "./compete/engine";
import { findSynthetic, pickSynthetics, syntheticVolumeInWindow } from "./matching";
import { addSimulatedReplay, competitionReplayFrame, indexCompetitionReplay, localCompetitionReplay, type CompetitionReplay, type CompetitionReplayEvent } from "./competition-replay";
const selection = { sport: "running" as const, track: "verified" as const, periodStart: "2026-10-19T04:00:00Z", periodEnd: "2026-10-26T04:00:00Z" };
const event = (id: string, athleteId: string, distanceM: number, at = "2026-10-20T12:00:00Z"): CompetitionReplayEvent => ({ id, athleteId, distanceM, movingSec: distanceM / 3, effort: distanceM / 1000, at });
const ledger = (events: CompetitionReplayEvent[]): CompetitionReplay => ({ ...selection, through: "2026-10-25T14:00:00Z", athletes: [{ id: "you", name: "You", you: true }, { id: "peer", name: "Peer", you: false }], events, scope: "field" });
describe("competition replay presentation ledger", () => {
  it("orders simultaneous workouts deterministically and scrubs backwards without accumulating twice", () => {
    const events = [event("b", "you", 2000), event("a", "peer", 1000)];
    const index = indexCompetitionReplay(ledger(events), "metric");
    expect(index.replay.events.map(e => e.id)).toEqual(["a", "b"]);
    expect(indexCompetitionReplay(ledger([...events].reverse()), "metric").replay.events).toEqual(index.replay.events);
    expect(competitionReplayFrame(index, 1).rows[0]?.id).toBe("peer");
    expect(competitionReplayFrame(index, 2).rows[0]?.id).toBe("you");
    expect(competitionReplayFrame(index, 1).rows.find(r => r.you)?.value).toBe(0);
    expect(competitionReplayFrame(index, 0).rows.every(r => r.value === 0)).toBe(true);
  });
  it("interpolates only the changing athlete and converts units exactly", () => {
    const index = indexCompetitionReplay(ledger([event("a", "peer", 1609.344), event("b", "you", 3218.688)]), "us");
    const frame = competitionReplayFrame(index, 1.5);
    expect(frame.rows.find(r => r.you)?.value).toBeCloseTo(1);
    expect(frame.rows.find(r => !r.you)?.value).toBeCloseTo(1);
    expect(competitionReplayFrame(index, 99).rows.find(r => r.you)?.value).toBeCloseTo(2);
    expect(competitionReplayFrame(index, -1).position).toBe(0);
  });
  it("rejects duplicate, future, out-of-period and invalid rows, preserving every valid event", () => {
    const good = event("good", "you", 1000);
    const index = indexCompetitionReplay(ledger([good, good, event("future", "you", 1000, "2026-10-25T20:00:00Z"), event("end", "you", 1000, selection.periodEnd), event("before", "you", 1000, "2026-10-18T12:00:00Z"), event("unknown", "other", 1000), event("negative", "you", -1)]), "metric");
    expect(index.replay.events).toEqual([good]);
    expect(index.series.get("you")?.steps).toEqual([0, 1]);
  });
  it("uses counted workouts only in local previews, including half-open period bounds", () => {
    const state = freshState(new Date("2026-10-25T14:00:00Z"));
    state.demoNow = "2026-10-25T14:00:00Z";
    const base = { id: "real", sport: "running" as const, startedAt: "2026-10-20T12:00:00Z", distanceM: 1000, movingSec: 360, avgHr: null, verified: true, source: "strava" as const };
    state.activities = [base, { ...base, id: "excluded", disposition: "excluded" }, { ...base, id: "pending", disposition: "pending" }, { ...base, id: "mock-preview" }, { ...base, id: "imported", provenance: "imported" }, { ...base, id: "future", startedAt: selection.periodEnd }];
    const replay = localCompetitionReplay(state, selection);
    expect(replay.events.filter(e => !e.simulated).map(e => e.id)).toEqual(["real"]);
  });
  it("matches simulated final volume to the live model without inventing real workout history", () => {
    const id = pickSynthetics("running", 1000, 1, [], "replay")[0]!.id;
    const replay = addSimulatedReplay(ledger([]), [id]);
    const volume = syntheticVolumeInWindow(findSynthetic("running", id)!, "running", new Date(selection.periodStart), new Date(selection.periodEnd), "verified", new Date(replay.through));
    const index = indexCompetitionReplay(replay, "metric");
    expect(competitionReplayFrame(index, replay.events.length).rows.find(a => a.id === id)?.value).toBeCloseTo(volume.distanceM / 1000);
    expect(replay.events.every(e => e.simulated)).toBe(true);
    expect(replay.events.some(e => e.athleteId === "peer")).toBe(false);
  });
  it("uses existing effort points for non-GPS fields", () => {
    const replay = { ...ledger([{ ...event("s", "you", 0), effort: 4, movingSec: 1800 }]), sport: "strength" as const, track: "open" as const };
    const index = indexCompetitionReplay(replay, "us");
    expect(index.unit).toBe("pts");
    expect(competitionReplayFrame(index, 1).rows.find(r => r.you)?.value).toBe(4);
  });
});
