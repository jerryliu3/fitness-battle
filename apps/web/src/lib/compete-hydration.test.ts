import { beforeEach, expect, it, vi } from "vitest";
import { freshState, reduceCompete, weeklyBoard, rollClock, prepareCompeteStateForAccount, buildArenaModel, type CrewBoardPin, type SportId } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ crew: vi.fn(), seat: vi.fn() }));
vi.mock("./week-field", () => ({ loadCrewWeekFieldPin: mock.crew, seatWeekFieldPin: mock.seat }));
import { hydrateFieldBoard, loadCompeteAccount } from "./compete-persist";
const now = "2026-10-21T12:00:00.000Z", start = "2026-10-19T04:00:00.000Z", end = "2026-10-26T04:00:00.000Z";
function pin(sport: SportId, crewId = "solo"): CrewBoardPin {
  return { sport, crewId, crewName: crewId === "solo" ? "Open Field" : "Cycling Crew", waveStart: start, weekEnd: end, capacity: 2,
    memberIds: ["athlete", `${sport}-peer`], syntheticIds: [], members: [
      { id: "athlete", name: "Me", elo: 1000, distanceM: 5000, movingSec: 1800, verifiedDistanceM: 5000, verifiedMovingSec: 1800 },
      { id: `${sport}-peer`, name: `${sport} Peer`, elo: 1100, distanceM: sport === "running" ? 12000 : 22000, movingSec: 3600, verifiedDistanceM: sport === "running" ? 10000 : 20000, verifiedMovingSec: 3000, avatarUrl: "https://example.test/peer.jpg" },
    ] };
}
function account(crew = true) {
  let state = freshState(new Date(now));
  for (const sport of ["running", "cycling"] as const) {
    state = reduceCompete(state, { type: "opt-in", sport, accountId: "athlete", now });
    state = reduceCompete(state, { type: "log-manual", sport, distanceM: 5000, movingSec: 1800, activityId: sport, now });
  }
  return { ...state, primary: "running" as const, activities: state.activities.map(a => ({ ...a, verified: true, provenance: "recorded" as const })), enrollments: state.enrollments.map(e => ({ ...e, crewId: crew && e.sport === "cycling" ? "cycling-crew" : null, autoEnrollNext: false })) };
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.crew.mockResolvedValue(pin("cycling", "cycling-crew"));
  mock.seat.mockImplementation(async (_db, input) => pin(input.sport));
});
it("does not change a durable enrollment when Postgres and the field use equivalent timestamp formats", async () => {
  const rows: Record<string, unknown> = {
    athlete_prefs: { clock_period_start: start, updated_at: now },
    profiles: { display_name: "Me", primary_sport: "running" },
    wave_enrollments: [{ sport: "running", wave_start: "2026-10-19T04:00:00+00:00", week_end: "2026-10-26T04:00:00+00:00", capacity: 2, peer_ids: ["running-peer"], synthetic_ids: [], auto_enroll_next: false, crew_id: null }],
  };
  const db = { from: (table: string) => {
    const result = { data: rows[table] ?? [], error: null };
    const query = { select: () => query, eq: () => query, not: () => query, order: () => query, limit: () => query, range: () => query,
      maybeSingle: () => Promise.resolve(result), then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
    return query;
  } };
  const loaded = await loadCompeteAccount(db as never, "athlete");
  const hydrated = await hydrateFieldBoard(db as never, "athlete", loaded!.state);
  expect(JSON.stringify(prepareCompeteStateForAccount(hydrated))).toBe(JSON.stringify(prepareCompeteStateForAccount(loaded!.state)));
});
it("hydrates Crew cycling and seats separate running, retaining real scores in both fields", async () => {
  const state = await hydrateFieldBoard({} as never, "athlete", account());
  expect(mock.crew).toHaveBeenCalledWith({}, "cycling-crew", start);
  expect(mock.seat).toHaveBeenCalledTimes(1);
  expect(mock.seat).toHaveBeenCalledWith({}, expect.objectContaining({ sport: "running", waveStart: start, weekEnd: end }));
  expect(state.crewBoard?.sport).toBe("cycling");
  for (const sport of ["running", "cycling"] as const) {
    const enrollment = state.enrollments.find(e => e.sport === sport)!;
    expect(enrollment.peerIds).toEqual([`${sport}-peer`]);
    expect(enrollment.autoEnrollNext).toBe(false);
    expect(enrollment.fieldBoard?.sport).toBe(sport);
    expect(weeklyBoard(state, sport, "open", new Date(now)).find(row => row.id === `${sport}-peer`)?.distanceM).toBe(sport === "running" ? 12000 : 22000);
    expect(weeklyBoard(state, sport, "verified", new Date(now)).find(row => row.id === `${sport}-peer`)?.distanceM).toBe(sport === "running" ? 10000 : 20000);
    expect(buildArenaModel(state, new Date(now), "open", sport).lanes.find(lane => lane.id === `${sport}-peer`)?.avatarUrl).toBe("https://example.test/peer.jpg");
  }
  const prepared = prepareCompeteStateForAccount(state);
  expect(prepared.crewBoard).toBeNull();
  expect(prepared.enrollments.every(e => !("fieldBoard" in e))).toBe(true);
  expect(state.enrollments.every(e => e.fieldBoard)).toBe(true);
  const settled = rollClock(state, new Date(end));
  for (const sport of ["running", "cycling"] as const) expect(settled.periodResults.find(row => row.sport === sport && row.track === "verified")?.place).toBe(2);
});
it("seats all solo sports even when only one is the primary sport", async () => {
  const state = await hydrateFieldBoard({} as never, "athlete", account(false));
  expect(mock.crew).not.toHaveBeenCalled();
  expect(mock.seat.mock.calls.map(([, input]) => input.sport).sort()).toEqual(["cycling", "running"]);
  expect(state.crewBoard?.sport).toBe("running");
});
it("still seats the other sport when the preferred Crew field is missing, without creating a Crew field on read", async () => {
  mock.crew.mockResolvedValue(null);
  const base = account();
  base.enrollments = base.enrollments.map(e => ({ ...e, fieldBoard: pin(e.sport) }));
  const state = await hydrateFieldBoard({} as never, "athlete", base);
  expect(mock.seat).toHaveBeenCalledTimes(1);
  expect(state.crewBoard).toBeNull();
  expect(state.enrollments.find(e => e.sport === "cycling")?.fieldBoard).toBeUndefined();
  expect(state.enrollments.find(e => e.sport === "running")?.fieldBoard?.sport).toBe("running");
});
it("keeps canonical server bounds and registration choices on each enrollment", async () => {
  mock.seat.mockResolvedValue({ ...pin("running"), waveStart: "2026-10-20T04:00:00+00:00", weekEnd: "2026-10-27T04:00:00+00:00" });
  const state = await hydrateFieldBoard({} as never, "athlete", account());
  expect(state.enrollments.find(e => e.sport === "running")).toMatchObject({ waveStart: "2026-10-20T04:00:00.000Z", weekEnd: "2026-10-27T04:00:00.000Z", autoEnrollNext: false });
  expect(state.enrollments.find(e => e.sport === "cycling")?.waveStart).toBe(start);
});

it("does no seating work when the account has no enrollments", async () => {
  const base = { ...account(), enrollments: [], crewBoard: pin("cycling") };
  const state = await hydrateFieldBoard({} as never, "athlete", base);
  expect(state.crewBoard).toBeNull();
  expect(mock.seat).not.toHaveBeenCalled();
  expect(mock.crew).not.toHaveBeenCalled();
});

it("normalizes legacy open-field aliases to canonical open membership", async () => {
  const base = account(false);
  base.enrollments[0]!.crewId = "field:legacy-open";
  const state = await hydrateFieldBoard({} as never, "athlete", base);
  expect(state.enrollments[0]!.crewId).toBeNull();
  expect(weeklyBoard(state, "running", "verified", new Date(now)).find(row => row.id === "running-peer")?.distanceM).toBe(10000);
});
