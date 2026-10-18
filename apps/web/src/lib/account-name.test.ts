import { describe, expect, it } from "vitest";
import { accountName } from "./account-name";

describe("accountName", () => {
  it("repairs guest and empty account profiles", () => {
    expect(accountName("Guest", "Jerry", "jerry@example.com")).toBe("Jerry");
    expect(accountName("", "", "jerry@example.com")).toBe("jerry");
    expect(accountName("Guest", "Guest", "jerry@example.com")).toBe("jerry");
  });
  it("preserves a profile name edited separately from auth metadata", () => {
    expect(accountName("Runner J", "Jerry", "jerry@example.com")).toBe("Runner J");
  });
});
