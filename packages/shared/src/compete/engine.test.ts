import { describe, expect, it } from "vitest";
import { freshState, reduceCompete, rollClock } from "./engine";

describe("compete engine", () => {
  it("allows one-time history import only", () => {
    const now = "2026-10-12T12:00:00.000Z";
    const first = reduceCompete(freshState(new Date(now)), {
      type: "import-history",
      level: "steady",
      now,
    });
    expect(first.calibrated).toBe(true);
    expect(first.activities.some((item) => item.source === "history")).toBe(
      true,
    );

    const second = reduceCompete(first, {
      type: "import-history",
      level: "heavy",
      now,
    });
    expect(second.activities).toEqual(first.activities);
    expect(second.ratings).toEqual(first.ratings);
  });

  it("marks demo links as stub, not connected", () => {
    const next = reduceCompete(freshState(), {
      type: "link",
      provider: "strava",
    });
    const link = next.links.find((item) => item.provider === "strava");
    expect(link?.linked).toBe(true);
    expect(link?.status).toBe("stub");
  });

  it("jumps the clock after a long gap instead of staying stale", () => {
    const ancient = freshState(new Date("2025-01-06T12:00:00.000Z"));
    const rolled = rollClock(ancient, new Date("2026-10-12T12:00:00.000Z"));
    expect(rolled.clock.periodStart).toBe("2026-10-12T00:00:00.000Z");
  });

  it("completes onboarding without clearing calibrated", () => {
    const calibrated = reduceCompete(freshState(), {
      type: "import-history",
      level: "light",
      now: "2026-10-12T12:00:00.000Z",
    });
    const done = reduceCompete(calibrated, { type: "complete-onboarding" });
    expect(done.onboardingCompleted).toBe(true);
    expect(done.calibrated).toBe(true);
  });
});
