import { describe, expect, it } from "vitest";
import { freshState } from "./engine";
import {
  prepareCompeteStateForAccount,
  sanitizeCompeteStateForAccount,
} from "./sanitize";

describe("sanitizeCompeteStateForAccount", () => {
  it("strips demoNow from account-durable state", () => {
    const state = {
      ...freshState(),
      demoNow: "2026-10-19T00:01:00.000Z",
    };
    expect(sanitizeCompeteStateForAccount(state).demoNow).toBeNull();
    expect(sanitizeCompeteStateForAccount(freshState()).demoNow).toBeNull();
  });

  it("strips durable crewBoard for account writes", () => {
    const state = {
      ...freshState(),
      demoNow: "2026-10-19T00:01:00.000Z",
      crewBoard: {
        crewId: "c1",
        crewName: "Crew",
        sport: "running" as const,
        waveStart: "2026-10-12T00:00:00.000Z",
        weekEnd: "2026-10-19T00:00:00.000Z",
        capacity: 8,
        memberIds: ["u1"],
        members: [{ id: "u1", name: "You", elo: 1000 }],
        syntheticIds: [] as string[],
      },
    };
    const prepared = prepareCompeteStateForAccount(state);
    expect(prepared.demoNow).toBeNull();
    expect(prepared.crewBoard).toBeNull();
  });
});
