import { describe, expect, it } from "vitest";
import { freshState } from "./compete/engine";
import { findSynthetic, pickSynthetics, syntheticVolumeInWindow } from "./matching";
import { addSimulatedReplay, competitionCourseReplayFrame, competitionReplayCursorFromTimeMs, competitionReplayDate, competitionReplayFrame, competitionReplayTimeMs, indexCompetitionReplay, localCompetitionReplay, type CompetitionReplay, type CompetitionReplayEvent } from "./competition-replay";
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
  it("frames geographic replay using the nearest visible rival", () => {
    const events = [event("a", "peer", 1000), event("b", "rival", 500), event("c", "you", 200)];
    const replay: CompetitionReplay = {
      ...ledger(events),
      athletes: [
        { id: "you", name: "You", you: true },
        { id: "peer", name: "Peer", you: false },
        { id: "rival", name: "Rival", you: false },
      ],
    };
    const index = indexCompetitionReplay(replay, "metric");
    expect(competitionCourseReplayFrame(index, 3, "you", ["peer"]).nearestId).toBe("rival");
  });
  it("interpolates every athlete between timeline steps and converts units exactly", () => {
    const index = indexCompetitionReplay(ledger([event("a", "peer", 1609.344), event("b", "you", 3218.688)]), "us");
    const midway = competitionReplayFrame(index, 0.5);
    expect(midway.rows.find(r => r.id === "peer")?.value).toBeCloseTo(0.5);
    expect(midway.rows.find(r => r.you)?.value).toBeCloseTo(0);
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
  it("uses hours for strength replay while retaining internal effort", () => {
    const replay = { ...ledger([{ ...event("s", "you", 0), effort: 4, movingSec: 1800 }]), sport: "strength" as const, track: "open" as const };
    const index = indexCompetitionReplay(replay, "us");
    expect(index.unit).toBe("hrs");
    expect(competitionReplayFrame(index, 1).rows.find(r => r.you)?.value).toBeCloseTo(0.5);
  });
  it("keeps a local preview to the signed-in athlete when no other account is seated", () => {
    const state = freshState(new Date("2026-10-25T14:00:00Z"));
    state.enrollments = [{ sport: "running", waveStart: selection.periodStart, weekEnd: selection.periodEnd, capacity: 8, peerIds: [], syntheticIds: ["synth:running:0"], autoEnrollNext: true }];
    const replay = localCompetitionReplay(state, selection);
    expect(replay.athletes).toEqual([expect.objectContaining({ you: true })]);
    expect(replay.events.every(event => !event.simulated)).toBe(true);
  });
  it("preserves seated fieldBoard peers in local preview without inventing opponent events", () => {
    const state = freshState(new Date("2026-10-25T14:00:00Z"));
    state.enrollments = [{
      sport: "running",
      waveStart: selection.periodStart,
      weekEnd: selection.periodEnd,
      capacity: 8,
      peerIds: ["peer-1"],
      syntheticIds: [],
      autoEnrollNext: true,
      fieldBoard: {
        crewId: "solo",
        crewName: "Open Field",
        sport: "running",
        waveStart: selection.periodStart,
        weekEnd: selection.periodEnd,
        capacity: 8,
        memberIds: ["you", "peer-1"],
        members: [
          { id: "you", name: "Athlete", elo: 1000, distanceM: 0, movingSec: 0, effort: 0 },
          { id: "peer-1", name: "Noah Brooks", elo: 1040, distanceM: 3000, movingSec: 900, effort: 3000 },
        ],
        syntheticIds: [],
      },
    }];
    const replay = localCompetitionReplay(state, selection);
    expect(replay.athletes.map(a => a.id)).toEqual(["you", "peer-1"]);
    expect(replay.events).toEqual([]);
  });
});

it("interpolates the displayed clock within an event, including reverse seeking", () => {
  const index = indexCompetitionReplay(ledger([event("first", "you", 1000, "2026-10-19T08:00:00Z")]), "metric");
  expect(competitionReplayDate(index, 0)).toContain("12:00 AM");
  expect(competitionReplayDate(index, .5)).toContain("2:00 AM");
  expect(competitionReplayDate(index, .75)).toContain("3:00 AM");
  expect(competitionReplayDate(index, .25)).toContain("1:00 AM");
});

it("converts bidirectionally between replay cursor and competition time ms", () => {
  const e1 = "2026-10-19T08:00:00Z";
  const e2 = "2026-10-20T12:00:00Z";
  const index = indexCompetitionReplay(ledger([event("e1", "you", 1000, e1), event("e2", "peer", 2000, e2)]), "metric");
  const startMs = Date.parse(selection.periodStart);
  const e1Ms = Date.parse(e1);
  const e2Ms = Date.parse(e2);

  expect(competitionReplayTimeMs(index, 0)).toBe(startMs);
  expect(competitionReplayTimeMs(index, 1)).toBe(e1Ms);
  expect(competitionReplayTimeMs(index, 0.5)).toBe(startMs + (e1Ms - startMs) * 0.5);
  expect(competitionReplayTimeMs(index, 1.5)).toBe(e1Ms + (e2Ms - e1Ms) * 0.5);
  expect(competitionReplayTimeMs(index, 2)).toBe(e2Ms);

  expect(competitionReplayCursorFromTimeMs(index, startMs)).toBe(0);
  expect(competitionReplayCursorFromTimeMs(index, startMs - 1000)).toBe(0);
  expect(competitionReplayCursorFromTimeMs(index, e1Ms)).toBe(1);
  expect(competitionReplayCursorFromTimeMs(index, startMs + (e1Ms - startMs) * 0.5)).toBeCloseTo(0.5);
  expect(competitionReplayCursorFromTimeMs(index, e1Ms + (e2Ms - e1Ms) * 0.5)).toBeCloseTo(1.5);
  expect(competitionReplayCursorFromTimeMs(index, e2Ms)).toBe(2);
  expect(competitionReplayCursorFromTimeMs(index, e2Ms + 10000)).toBe(2);
});


it("replays daily walking steps once per day using the highest provider reading", () => {
  const state = freshState(new Date("2026-10-25T14:00:00Z"));
  state.demoNow = "2026-10-25T14:00:00Z";
  state.dailyHealth = [
    { provider: "strava", day: "2026-10-20", steps: 4000 },
    { provider: "garmin", day: "2026-10-20", steps: 6000 },
    { provider: "garmin", day: "2026-10-21", steps: 2000 },
    { provider: "garmin", day: "2026-10-26", steps: 9000 },
  ];
  const replay = localCompetitionReplay(state, { ...selection, sport: "walking", track: "open" });
  const index = indexCompetitionReplay(replay, "metric");
  expect(index.unit).toBe("steps");
  expect(replay.events).toHaveLength(2);
  expect(competitionReplayFrame(index, 2).rows.find(row => row.you)?.value).toBe(8000);
});
