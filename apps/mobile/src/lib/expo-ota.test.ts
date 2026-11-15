import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const updates = vi.hoisted(() => ({
  isEnabled: true,
  checkForUpdateAsync: vi.fn(),
  fetchUpdateAsync: vi.fn(),
  reloadAsync: vi.fn(),
}));

vi.mock("expo-updates", () => updates);

import { applyExpoUpdateOnLaunch } from "./expo-ota";

describe("applyExpoUpdateOnLaunch", () => {
  beforeEach(() => {
    vi.stubGlobal("__DEV__", false);
    updates.isEnabled = true;
    updates.checkForUpdateAsync.mockReset();
    updates.fetchUpdateAsync.mockReset();
    updates.reloadAsync.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips in development", async () => {
    vi.stubGlobal("__DEV__", true);
    await applyExpoUpdateOnLaunch();
    expect(updates.checkForUpdateAsync).not.toHaveBeenCalled();
  });

  it("downloads updates for the next launch without reloading", async () => {
    updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true });
    await applyExpoUpdateOnLaunch();
    expect(updates.fetchUpdateAsync).toHaveBeenCalled();
    expect(updates.reloadAsync).not.toHaveBeenCalled();
  });

  it("does nothing when the bundle is current", async () => {
    updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false });
    await applyExpoUpdateOnLaunch();
    expect(updates.fetchUpdateAsync).not.toHaveBeenCalled();
    expect(updates.reloadAsync).not.toHaveBeenCalled();
  });
});