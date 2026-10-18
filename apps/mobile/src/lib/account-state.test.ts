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
  it("lifts only live empty accounts and leaves guests at the shared baseline", () => {
    const state = freshState();
    expect(hydrateAccountIdentity(state, null, false).ratings[0].openElo).toBe(
      500,
    );
    expect(
      hydrateAccountIdentity(
        state,
        { displayName: "Alice", email: "a@test.com" },
        true,
      ).ratings[0].openElo,
    ).toBe(1000);
  });
  it("explains an open-week save conflict rather than hiding it", () => {
    expect(saveFailure("week_still_open")).toContain("still open");
    expect(saveFailure()).toContain("this device");
  });
});
