import { describe, expect, it } from "vitest";
import { freshState, periodEffort, type Activity } from "@fitness-battle/shared";
import { activityPayload, overtakeActivity, registrationPlan } from "./admin-scenario";
const now = new Date("2026-11-01T16:00:00Z");
function registered(sport: "running" | "strength" = "running") {
  const state = freshState(now);
  const plan = registrationPlan(state, sport, "athlete", new Date("2026-10-26T09:00:00Z"));
  return { ...state, enrollments: [plan.enrollment!], ratings: state.ratings.map((row) => row.sport === sport ? plan.rating! : row) };
}
const manual: Activity = { id: "manual", sport: "running", startedAt: "2026-10-31T16:00:00Z", distanceM: 5000, movingSec: 1800, avgHr: null, source: "manual", verified: false, provenance: "manual" };
describe("admin scenario planning", () => {
  it("registers with the ordinary Eastern DST boundary and rejects overdue or duplicate enrollment", () => {
    const state = registered();
    expect(state.enrollments[0]!.weekEnd).toBe("2026-11-02T05:00:00.000Z");
    expect(() => registrationPlan(state, "running", "athlete", now)).toThrow("already_registered");
    expect(() => registrationPlan(state, "cycling", "athlete", new Date("2026-11-03"))).toThrow("settle_due_rounds_first");
  });
  it("creates enough volume to pass without altering either account", () => {
    const mover = registered(), other = { ...registered(), activities: [manual] };
    const payload = overtakeActivity(mover, other, "running", false, now);
    const added: Activity = { ...manual, ...payload, id: "added" };
    const before = periodEffort(other.activities, "running", new Date(mover.enrollments[0]!.waveStart), now, "open");
    const after = periodEffort([added], "running", new Date(mover.enrollments[0]!.waveStart), now, "open");
    expect(after.distanceM).toBeGreaterThan(before.distanceM);
    expect(after.effort).toBeGreaterThan(before.effort);
    expect(mover.activities).toHaveLength(0);
  });
  it("does not count manual activity on Verified", () => {
    const payload = overtakeActivity(registered(), { ...registered(), activities: [manual, { ...manual, id: "gps", distanceM: 1000, movingSec: 600, verified: true, provenance: "recorded", source: "strava" }] }, "running", true, now);
    expect(payload.distanceM).toBe(1500);
    expect(payload.verified).toBe(true);
  });
  it("requires matching live windows and a mover that is strictly behind", () => {
    expect(() => overtakeActivity({ ...registered(), activities: [manual] }, registered(), "running", false, now)).toThrow("mover_must_be_behind");
    expect(() => overtakeActivity(registered(), registered(), "running", false, new Date("2026-11-04"))).toThrow("matching_active");
    expect(() => overtakeActivity(registered("strength"), registered("strength"), "strength", true, now)).toThrow("strength_has_no_verified");
  });
  it("rejects future, invalid or unbounded activities", () => {
    const input = { distanceM: 1000, movingSec: 600, verified: false };
    expect(activityPayload(input, now).startedAt).toBe("2026-11-01T15:59:59.999Z");
    for (const extra of [{ startedAt: "2026-11-05" }, { movingSec: 0 }, { distanceM: -1 }, { distanceM: Infinity }]) {
      expect(() => activityPayload({ ...input, ...extra }, now)).toThrow("invalid_activity");
    }
  });
});
