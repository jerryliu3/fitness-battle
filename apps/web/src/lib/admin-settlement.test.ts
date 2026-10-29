import { describe, expect, it, vi } from "vitest";
import { freshState, reduceCompete } from "@fitness-battle/shared";
import { readAdminSettlementFields } from "./admin-settlement";
const now = "2026-10-19T15:00:00Z";
function fixture(failActivities = false) {
 let state = reduceCompete(freshState(new Date(now)), { type: "opt-in", sport: "running", accountId: "athlete", now });
 state = { ...state, enrollments: state.enrollments.map((row) => ({ ...row, peerIds: ["peer"] })) };
 const enrollment = state.enrollments[0]!;
 const tables: Record<string, unknown[]> = {
  week_fields: [{ id: "field", sport: "running", wave_start: enrollment.waveStart, week_end: enrollment.weekEnd, member_ids: ["athlete", "peer"], synthetic_ids: [], capacity: 2, crew_id: null, name: "Open Field" }],
  profiles: [{ id: "peer", display_name: "Peer" }], sport_ratings: [{ user_id: "peer", open_elo: 1100, verified_elo: 900 }],
  activities: [
   { user_id: "peer", sport: "running", started_at: now, distance_m: 10000, moving_sec: 3600, provenance: "recorded", verified: true, disposition: "counted", source_label: "strava", compete_key: "gps-1" },
   { user_id: "peer", sport: "running", started_at: now, distance_m: 5000, moving_sec: 1800, provenance: "manual", disposition: "counted", source_label: "manual", compete_key: "manual-1" },
   { user_id: "peer", sport: "running", started_at: now, distance_m: 50000, moving_sec: 1800, provenance: "demo", disposition: "counted", source_label: "strava", compete_key: "strava-stub-1" },
  ],
 };
 const filters: unknown[][] = [];
 const db = { rpc: vi.fn(() => { throw new Error("Athlete-scoped RPC must not be called"); }), from: (table: string) => {
  const query: any = { then: (resolve: any) => Promise.resolve({ data: tables[table], error: failActivities && table === "activities" ? { message: "offline" } : null }).then(resolve) };
  for (const method of ["select", "eq", "contains", "in", "gte", "lt"]) query[method] = (...args: unknown[]) => { filters.push([table, method, ...args]); return query; };
  return query;
 } };
 return { state, db, filters, tables };
}
describe("admin field reads", () => {
 it("retains weighted strength effort in an authorized admin settlement", async () => {
  const { state, db, tables } = fixture();
  state.enrollments = state.enrollments.map(e => ({ ...e, sport: "strength" }));
  tables.week_fields = tables.week_fields.map(row => ({ ...(row as object), sport: "strength" }));
  tables.activities = tables.activities.map(row => ({ ...(row as object), sport: "strength", avg_hr: 180 }));
  const [pin] = await readAdminSettlementFields(db as never, "athlete", state);
  expect(pin!.members.find(member => member.id === "peer")!.effort).toBeCloseTo(13.44);
 });
 it("reads existing target membership without seating or invoking athlete RPCs and excludes samples", async () => {
  const { state, db, filters } = fixture();
  const [pin] = await readAdminSettlementFields(db as never, "athlete", state);
  expect(db.rpc).not.toHaveBeenCalled();
  expect(filters).toContainEqual(["week_fields", "contains", "member_ids", ["athlete"]]);
  expect(pin!.members.find((member) => member.id === "peer")?.distanceM).toBe(15000);
  expect(pin!.members.find((member) => member.id === "peer")).toMatchObject({ verifiedDistanceM: 10000, verifiedMovingSec: 3600, verifiedElo: 900, elo: 1100 });
 });
 it("refuses settlement if roster data is incomplete", async () => {
  const { state, db } = fixture(true);
  await expect(readAdminSettlementFields(db as never, "athlete", state)).rejects.toThrow("field_roster_unavailable");
 });
});
