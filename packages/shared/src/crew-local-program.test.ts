import { expect, it } from "vitest";
import { emptyCrewProgram, mutateLocalCrewProgram, readLocalCrewProgram } from "./crew-local-program";
import type { CrewOverviewInput } from "./crew-overview";
const input: CrewOverviewInput = { now: "2026-11-11T18:00:00Z", members: [{ user_id: "alice", display_name: "Alice" }], entries: [{ user_id: "alice", started_at: "2026-11-10T12:00:00Z", distance_m: 1000, moving_sec: 600 }], sport: "running", format: "volume", targetSessions: 3 };
it("lets an offline account configure a season and contract and retain earned stamps", () => {
  let state = mutateLocalCrewProgram(emptyCrewProgram(), input, { action: "season", crewId: "crew", title: "November", startsAt: "2026-11-09T05:00:00Z", endsAt: "2026-11-23T05:00:00Z" }, "season");
  state = mutateLocalCrewProgram(state, input, { action: "contract", crewId: "crew", title: "Together", metric: "sessions", target: 1, expectedId: null }, "contract");
  expect(state.passport.contract?.value).toBe(1);
  expect(state.passport.contract?.season_id).toBe("season");
  expect(state.passport.stamps).toHaveLength(0);
  const nextWeek = { ...input, now: "2026-11-16T05:00:00Z", entries: [] };
  state = readLocalCrewProgram(state, nextWeek);
  expect(state.passport.contract).toBeNull();
  expect(state.passport.stamps.map(s => s.code)).toEqual(["contract_finish", "full_crew"]);
  expect(readLocalCrewProgram(state, nextWeek).passport.stamps).toHaveLength(2);
});
it("rejects lost contract updates and overlapping season windows", () => {
  const state = mutateLocalCrewProgram(emptyCrewProgram(), input, { action: "contract", crewId: "crew", title: "Together", metric: "distance_m", target: 1000, expectedId: null }, "one");
  expect(() => mutateLocalCrewProgram(state, input, { action: "contract", crewId: "crew", title: "Changed", metric: "sessions", target: 1, expectedId: null }, "two")).toThrow(/teammate/);
  const withSeason = mutateLocalCrewProgram(state, input, { action: "season", crewId: "crew", title: "Season", startsAt: "2026-11-09T05:00:00Z", endsAt: "2026-11-23T05:00:00Z" }, "season");
  expect(() => mutateLocalCrewProgram(withSeason, input, { action: "season", crewId: "crew", title: "Overlap", startsAt: "2026-11-16T05:00:00Z", endsAt: "2026-11-30T05:00:00Z" }, "overlap")).toThrow(/overlap/);
});
