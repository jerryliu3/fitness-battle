import { describe, expect, it } from "vitest";
import {
  isCompeteAccountIntentAction,
  isPhaseACompeteIntentAction,
  normalizeCompeteIntent,
  serializeCompeteIntent,
} from "./intents";
import type { Action } from "./engine";

const now = "2026-10-21T12:00:00.000Z";

describe("compete intents phase A", () => {
  it("classifies profile and enrollment actions", () => {
    expect(isPhaseACompeteIntentAction({ type: "rename" })).toBe(true);
    expect(isPhaseACompeteIntentAction({ type: "log-manual" })).toBe(false);
  });

  it("normalizes rename and rejects empty names", () => {
    const action = normalizeCompeteIntent(
      { type: "rename", name: "  Ada  " },
      "user-1",
      now,
    );
    expect(action).toMatchObject({ type: "rename", name: "Ada", accountId: "user-1", now });
    expect(() =>
      normalizeCompeteIntent({ type: "rename", name: "   " }, "user-1", now),
    ).toThrow(/invalid_intent/);
  });

  it("strips account wiring from wire payloads", () => {
    const action: Action = {
      type: "opt-in",
      sport: "running",
      accountId: "local",
      now: "old",
    };
    expect(serializeCompeteIntent(action)).toEqual({ type: "opt-in", sport: "running" });
  });

  it("accepts phase B account intents", () => {
    expect(isCompeteAccountIntentAction({ type: "log-manual" })).toBe(true);
    expect(isCompeteAccountIntentAction({ type: "apply-sync" })).toBe(false);
    expect(
      normalizeCompeteIntent(
        {
          type: "log-manual",
          sport: "running",
          activityId: "manual-today",
          movingSec: 3600,
          distanceM: 5000,
        },
        "user-1",
        now,
      ).activityId,
    ).toBe("manual-today");
  });
});