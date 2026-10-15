import { describe, expect, it } from "vitest";
import { freshState } from "./engine";
import { sanitizeCompeteStateForAccount } from "./sanitize";

describe("sanitizeCompeteStateForAccount", () => {
  it("strips demoNow from account-durable state", () => {
    const state = {
      ...freshState(),
      demoNow: "2026-10-19T00:01:00.000Z",
    };
    expect(sanitizeCompeteStateForAccount(state).demoNow).toBeNull();
    expect(sanitizeCompeteStateForAccount(freshState()).demoNow).toBeNull();
  });
});
