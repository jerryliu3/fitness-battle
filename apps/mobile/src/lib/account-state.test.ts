import { freshState } from "@fitness-battle/shared";
import { describe, expect, it } from "vitest";
import {
  accountStorageKeys,
  hydrateAccountIdentity,
  nameForAccount,
  saveFailure,
} from "./account-state";
describe("mobile account state", () => {
  it("isolates training, dirty drafts, and seen activity by account and guest", () => {
    const keys = [null, "alice", "bob"].flatMap((id) =>
      Object.values(accountStorageKeys(id)),
    );
    expect(new Set(keys).size).toBe(9);
  });
  it("repairs Guest names while preserving independently edited profile names", () => {
    expect(nameForAccount("Guest", "Alice", "alice@example.com")).toBe("Alice");
    expect(nameForAccount("Runner A", "Alice", "alice@example.com")).toBe(
      "Runner A",
    );
    expect(nameForAccount("Guest", "Guest", "alice@example.com")).toBe("alice");
  });
  it("starts guests and signed-in empty accounts at zero", () => {
    const state = freshState();
    expect(hydrateAccountIdentity(state, null, false).ratings[0].openElo).toBe(
      0,
    );
    expect(
      hydrateAccountIdentity(
        state,
        { displayName: "Alice", email: "a@test.com" },
        true,
      ).ratings[0].openElo,
    ).toBe(0);
  });
  it("suppresses week_still_open sync noise while surfacing other save failures", () => {
    expect(saveFailure("week_still_open")).toBeNull();
    expect(saveFailure()).toContain("this device");
  });
});
