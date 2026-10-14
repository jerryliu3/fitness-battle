import { describe, expect, it } from "vitest";
import { freshState } from "./engine";
import { chooseCompeteState } from "./snapshot";

describe("chooseCompeteState", () => {
  it("keeps the device copy when it is newer than the server", () => {
    const local = freshState(new Date("2026-10-13T00:00:00.000Z"));
    const remote = freshState(new Date("2026-10-12T00:00:00.000Z"));
    remote.name = "Server";
    const chosen = chooseCompeteState(
      { savedAt: "2026-10-14T00:00:00.000Z", state: { ...local, name: "Device" } },
      { updatedAt: "2026-10-13T00:00:00.000Z", state: remote },
    );
    expect(chosen.name).toBe("Device");
  });

  it("replaces the device copy when the server snapshot is newer", () => {
    const local = freshState();
    const remote = { ...freshState(), name: "Server" };
    const chosen = chooseCompeteState(
      { savedAt: "2026-10-12T00:00:00.000Z", state: local },
      { updatedAt: "2026-10-13T00:00:00.000Z", state: remote },
    );
    expect(chosen.name).toBe("Server");
  });
});
