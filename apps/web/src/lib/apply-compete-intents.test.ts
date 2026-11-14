import { describe, expect, it } from "vitest";
import { freshState } from "@fitness-battle/shared";
import { applyCompeteIntents } from "./apply-compete-intents";

const userId = "athlete";
const now = new Date("2026-10-21T09:00:00.000Z");

describe("applyCompeteIntents", () => {
  it("applies profile intents on the server baseline", () => {
    const next = applyCompeteIntents(
      freshState(now),
      [{ type: "rename", name: "River" }],
      userId,
      now,
    );
    expect(next.name).toBe("River");
  });

  it("registers sport enrollment without a client document", () => {
    const next = applyCompeteIntents(
      freshState(now),
      [{ type: "opt-in", sport: "running" }],
      userId,
      now,
    );
    expect(next.enrollments.some((e) => e.sport === "running")).toBe(true);
  });

  it("logs manual activity on the server baseline", () => {
    const next = applyCompeteIntents(
      freshState(now),
      [
        {
          type: "log-manual",
          sport: "running",
          activityId: "manual-test",
          movingSec: 2400,
          distanceM: 8000,
        },
      ],
      userId,
      now,
    );
    expect(next.activities.some((a) => a.id === "manual-test")).toBe(true);
  });
});