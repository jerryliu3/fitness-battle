import { describe, expect, it, vi } from "vitest";
import {
  fieldChangeNotice,
  freshState,
  reduceCompete,
  rollClock,
  seenFieldFromState,
  weeklyBoard,
  type CompeteState,
  type SportId,
} from "@fitness-battle/shared";
import { hydrateFieldBoard } from "./compete-persist";

describe("Competition Lifecycle & Unified Multiplayer Standings", () => {
  it("seats solo athletes into open fields, shares real peers and tops up synthetics to capacity 8", async () => {
    const waveStart = "2026-10-19T04:00:00.000Z";
    const weekEnd = "2026-10-26T04:00:00.000Z";

    // Athlete A state with solo running enrollment
    let stateA = freshState(new Date(waveStart));
    stateA = reduceCompete(stateA, { type: "opt-in", sport: "running", now: waveStart });

    // Mock DB RPC responses for Athlete A
    const mockDbA = {
      rpc: vi.fn().mockImplementation((name: string) => {
        if (name === "seat_athlete_week_field") {
          return Promise.resolve({
            data: {
              id: "field-1",
              sport: "running",
              wave_start: waveStart,
              week_end: weekEnd,
              capacity: 8,
              member_ids: ["athlete-a"],
              synthetic_ids: ["syn-1", "syn-2", "syn-3", "syn-4", "syn-5", "syn-6", "syn-7"],
              name: "Open Field",
            },
            error: null,
          });
        }
        if (name === "week_field_roster") {
          return Promise.resolve({
            data: [
              {
                user_id: "athlete-a",
                display_name: "Athlete A",
                open_elo: 1000,
                distance_m: 5000,
                moving_sec: 1500,
              },
            ],
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    };

    const hydratedA = await hydrateFieldBoard(mockDbA as any, "athlete-a", stateA);
    expect(hydratedA.crewBoard).not.toBeNull();
    expect(hydratedA.crewBoard?.crewId).toBe("solo");
    expect(hydratedA.crewBoard?.memberIds).toEqual(["athlete-a"]);
    expect(hydratedA.crewBoard?.members).toHaveLength(1);
    expect(hydratedA.crewBoard?.syntheticIds).toHaveLength(7);
    expect(hydratedA.crewBoard?.members.length! + hydratedA.crewBoard?.syntheticIds.length!).toBe(8);

    // Athlete B joins the same field (multiplayer)
    let stateB = freshState(new Date(waveStart));
    stateB = reduceCompete(stateB, { type: "opt-in", sport: "running", now: waveStart });

    const mockDbB = {
      rpc: vi.fn().mockImplementation((name: string) => {
        if (name === "seat_athlete_week_field") {
          return Promise.resolve({
            data: {
              id: "field-1",
              sport: "running",
              wave_start: waveStart,
              week_end: weekEnd,
              capacity: 8,
              member_ids: ["athlete-a", "athlete-b"],
              synthetic_ids: ["syn-1", "syn-2", "syn-3", "syn-4", "syn-5", "syn-6"],
              name: "Open Field",
            },
            error: null,
          });
        }
        if (name === "week_field_roster") {
          return Promise.resolve({
            data: [
              {
                user_id: "athlete-a",
                display_name: "Athlete A",
                open_elo: 1000,
                distance_m: 5000,
                moving_sec: 1500,
              },
              {
                user_id: "athlete-b",
                display_name: "Athlete B",
                open_elo: 1050,
                distance_m: 7500,
                moving_sec: 2200,
              },
            ],
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    };

    const hydratedB = await hydrateFieldBoard(mockDbB as any, "athlete-b", stateB);
    expect(hydratedB.crewBoard?.memberIds).toEqual(["athlete-a", "athlete-b"]);
    expect(hydratedB.crewBoard?.members).toHaveLength(2);
    // Athlete B sees Athlete A as a peer
    const enrB = hydratedB.enrollments.find((e) => e.sport === "running");
    expect(enrB?.peerIds).toEqual(["athlete-a"]);
    expect(enrB?.syntheticIds).toHaveLength(6);
    expect(hydratedB.crewBoard?.members.length! + hydratedB.crewBoard?.syntheticIds.length!).toBe(8);

    // Verify weeklyBoard scores both real players with their counted volume
    const boardB = weeklyBoard(hydratedB, "running", "open", new Date("2026-10-21T12:00:00Z"));
    const rowYou = boardB.find((r) => r.you);
    const rowPeerA = boardB.find((r) => r.id === "athlete-a");
    expect(rowYou).toBeDefined();
    expect(rowPeerA).toBeDefined();
    expect(rowPeerA?.distanceM).toBe(5000);
  });

  it("detects competitor volume gain and produces real-time field notice", () => {
    const waveStart = "2026-10-19T04:00:00.000Z";
    const baseState: CompeteState = {
      ...freshState(new Date(waveStart)),
      name: "Athlete B",
      primary: "running",
      enrollments: [
        {
          sport: "running",
          waveStart,
          weekEnd: "2026-10-26T04:00:00.000Z",
          capacity: 8,
          peerIds: ["athlete-a"],
          syntheticIds: ["syn-1", "syn-2", "syn-3", "syn-4", "syn-5", "syn-6"],
          autoEnrollNext: true,
          crewId: null,
        },
      ],
      crewBoard: {
        crewId: "solo",
        crewName: "Open Field",
        sport: "running",
        waveStart,
        weekEnd: "2026-10-26T04:00:00.000Z",
        capacity: 8,
        memberIds: ["athlete-a", "athlete-b"],
        members: [
          { id: "athlete-a", name: "Athlete A", elo: 1000, distanceM: 5000, movingSec: 1500 },
          { id: "athlete-b", name: "Athlete B", elo: 1050, distanceM: 6000, movingSec: 1800 },
        ],
        syntheticIds: ["syn-1", "syn-2", "syn-3", "syn-4", "syn-5", "syn-6"],
      },
    };

    const seenBefore = seenFieldFromState(baseState, "athlete-b", new Date("2026-10-20T12:00:00Z"));
    expect(seenBefore).not.toBeNull();
    expect(seenBefore?.rivals).toHaveLength(1);
    expect(seenBefore?.rivals[0]?.distanceM).toBe(5000);

    // 60s poll returns updated state where Athlete A ran an additional 3000m (now 8000m)
    const updatedState: CompeteState = {
      ...baseState,
      crewBoard: {
        ...baseState.crewBoard!,
        members: [
          { id: "athlete-a", name: "Athlete A", elo: 1000, distanceM: 8000, movingSec: 2400 },
          { id: "athlete-b", name: "Athlete B", elo: 1050, distanceM: 6000, movingSec: 1800 },
        ],
      },
    };

    const seenAfter = seenFieldFromState(updatedState, "athlete-b", new Date("2026-10-20T12:01:00Z"));
    const notice = fieldChangeNotice(seenBefore, seenAfter!);
    expect(notice).not.toBeNull();
    expect(notice?.rival).toBe(true);
    expect(notice?.title).toContain("Athlete A added");
  });

  it("handles stop-after-this-week: stays active this week and stops renewal at week rollover", () => {
    const waveStart = "2026-10-12T04:00:00.000Z";
    let state = freshState(new Date(waveStart));
    state = reduceCompete(state, { type: "opt-in", sport: "running", now: waveStart });

    expect(state.enrollments[0]?.autoEnrollNext).toBe(true);

    // Athlete chooses "Stop after this week" in settings or recap
    state = reduceCompete(state, { type: "schedule-leave", sport: "running", now: waveStart });
    expect(state.enrollments[0]?.autoEnrollNext).toBe(false);
    // Athlete is STILL opted-in and competing for the current week
    expect(state.ratings.find((r) => r.sport === "running")?.optedIn).toBe(true);

    // Week advances past Monday 00:00 America/New_York
    const nextMonday = new Date("2026-10-19T04:00:01.000Z");
    const rolled = rollClock(state, nextMonday);

    // Settled period result was recorded for the week
    const result = rolled.periodResults.find((r) => r.sport === "running");
    expect(result).toBeDefined();

    // Athlete was NOT renewed for the new week
    const nextEnrollment = rolled.enrollments.find(
      (e) => e.sport === "running" && e.waveStart === "2026-10-19T04:00:00.000Z",
    );
    expect(nextEnrollment).toBeUndefined();
    expect(rolled.ratings.find((r) => r.sport === "running")?.optedIn).toBe(false);
  });
});
