import { describe, expect, it } from "vitest";
import { reduceCompete, freshState } from "./engine";
import { alignCompeteWaves, canonicalWaveEnrollment } from "./wave-align";
import { periodResultId } from "./history";

describe("wave alignment", () => {
  it("maps UTC-midnight enrollments onto Eastern Monday weeks", () => {
    const legacy = canonicalWaveEnrollment({
      sport: "running",
      waveStart: "2026-10-12T00:00:00.000Z",
      weekEnd: "2026-10-19T00:00:00.000Z",
      capacity: 8,
      peerIds: [],
      syntheticIds: [],
      autoEnrollNext: true,
    });
    expect(legacy.waveStart).toBe("2026-10-12T04:00:00.000Z");
    expect(legacy.weekEnd).toBe("2026-10-19T04:00:00.000Z");
  });

  it("does not settle a UTC-midnight week before Eastern close", () => {
    const now = new Date("2026-10-19T03:00:00.000Z"); // Sunday 11pm ET
    let state = freshState(now);
    state = {
      ...state,
      enrollments: [
        canonicalWaveEnrollment({
          sport: "running",
          waveStart: "2026-10-12T00:00:00.000Z",
          weekEnd: "2026-10-19T00:00:00.000Z",
          capacity: 8,
          peerIds: ["a", "b"],
          syntheticIds: [],
          autoEnrollNext: true,
        }),
      ],
      ratings: state.ratings.map((row) =>
        row.sport === "running" ? { ...row, optedIn: true } : row,
      ),
    };
    const aligned = alignCompeteWaves(state, now);
    expect(aligned.enrollments[0]?.weekEnd).toBe("2026-10-19T04:00:00.000Z");
    expect(aligned.enrollments).toHaveLength(1);
    expect(aligned.periodResults).toHaveLength(0);
  });

  it("auto-acknowledges a stale reveal while the same week is still open", () => {
    const now = new Date("2026-10-19T03:00:00.000Z");
    const periodStart = "2026-10-12T00:00:00.000Z";
    const periodEnd = "2026-10-19T00:00:00.000Z";
    const state = alignCompeteWaves(
      {
        ...freshState(now),
        enrollments: [
          {
            sport: "running",
            waveStart: "2026-10-12T04:00:00.000Z",
            weekEnd: "2026-10-19T04:00:00.000Z",
            capacity: 8,
            peerIds: [],
            syntheticIds: [],
            autoEnrollNext: true,
          },
        ],
        ratings: freshState(now).ratings.map((row) =>
          row.sport === "running" ? { ...row, optedIn: true } : row,
        ),
        periodResults: [
          {
            id: periodResultId(periodStart, "running", "open"),
            periodStart,
            periodEnd,
            sport: "running",
            track: "open",
            place: 3,
            fieldSize: 8,
            effort: 12,
            distanceM: 10000,
            movingSec: 3000,
            eloBefore: 1000,
            eloAfter: 988,
            frozen: false,
            settledAt: "2026-10-19T00:00:01.000Z",
            acknowledgedAt: null,
          },
        ],
      },
      now,
    );
    const open = state.periodResults.find((row) => row.track === "open");
    expect(open?.acknowledgedAt).not.toBeNull();
    expect(state.pendingRevealIds).toHaveLength(0);
  });

  it("returns the same state reference when waves are already canonical", () => {
    const joined = reduceCompete(freshState(), {
      type: "opt-in",
      sport: "running",
      now: "2026-10-12T12:00:00.000Z",
    });
    const again = alignCompeteWaves(joined, new Date("2026-10-14T12:00:00.000Z"));
    expect(again).toBe(joined);
  });

  it("settles only once after Eastern close when legacy bounds are normalized", () => {
    const joined = reduceCompete(freshState(), {
      type: "opt-in",
      sport: "running",
      now: "2026-10-12T12:00:00.000Z",
    });
    const withLegacy = alignCompeteWaves({
      ...joined,
      enrollments: joined.enrollments.map((row) => ({
        ...row,
        waveStart: "2026-10-12T00:00:00.000Z",
        weekEnd: "2026-10-19T00:00:00.000Z",
      })),
    });
    const closed = reduceCompete(withLegacy, {
      type: "debug-close-week",
      now: "2026-10-12T12:00:00.000Z",
    });
    expect(
      closed.periodResults.filter(
        (row) => row.sport === "running" && row.track === "open",
      ),
    ).toHaveLength(1);
  });
});
