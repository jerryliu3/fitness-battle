import { describe, expect, it, vi } from "vitest";
import { freshState, reduceCompete, rollClock } from "@fitness-battle/shared";
import { readWeekFieldPin } from "./week-field";

describe("regular field roster scoring", () => {
  it("passes separate Open and Verified totals through the loader into rollover", async () => {
    const now = "2026-10-19T15:00:00Z";
    let state = reduceCompete(freshState(new Date(now)), { type: "opt-in", sport: "running", now });
    state = reduceCompete(state, { type: "log-manual", sport: "running", distanceM: 5000, movingSec: 1800, activityId: "gps-self", now });
    state = { ...state, activities: state.activities.map((row) => ({ ...row, verified: true, provenance: "recorded" as const })),
      enrollments: state.enrollments.map((row) => ({ ...row, capacity: 2, peerIds: ["peer"], syntheticIds: [] })) };
    const enrollment = state.enrollments[0]!;
    const db = { rpc: vi.fn().mockResolvedValue({ data: [{ user_id: "peer", display_name: "Peer", open_elo: 1200, verified_elo: 900, distance_m: 50000, moving_sec: 18000, verified_distance_m: 10000, verified_moving_sec: 3600 }], error: null }) };
    const pin = await readWeekFieldPin(db as never, { id: "field", sport: "running", wave_start: enrollment.waveStart, week_end: enrollment.weekEnd, capacity: 2, crew_id: null, name: "Field", member_ids: ["you", "peer"], synthetic_ids: [] });
    expect(pin.members[0]).toMatchObject({ verifiedElo: 900, verifiedDistanceM: 10000, verifiedMovingSec: 3600, distanceM: 50000 });
    const settled = rollClock({ ...state, crewBoard: pin }, new Date(enrollment.weekEnd));
    expect(settled.periodResults.find((row) => row.track === "verified")?.place).toBe(2);
    expect(settled.periodResults.find((row) => row.track === "open")?.place).toBe(2);
  });
});
