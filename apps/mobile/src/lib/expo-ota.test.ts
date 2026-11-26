import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  alert: vi.fn(),
  openURL: vi.fn(),
  fetchWithTimeout: vi.fn(),
  updates: {
    isEnabled: true,
    checkForUpdateAsync: vi.fn(),
    fetchUpdateAsync: vi.fn(),
    reloadAsync: vi.fn(),
  },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => state.storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, val: string) => {
      state.storage.set(key, val);
    }),
  },
}));
vi.mock("expo-constants", () => ({
  default: { expoConfig: { version: "0.4.0" } },
}));
vi.mock("expo-updates", () => state.updates);
vi.mock("react-native", () => ({
  Alert: { alert: state.alert },
  Linking: { openURL: state.openURL },
  Platform: { OS: "ios" },
}));
vi.mock("./env", () => ({
  mobileEnv: { apiUrl: "https://test.local" },
}));
vi.mock("./fetch-with-timeout", () => ({
  fetchWithTimeout: state.fetchWithTimeout,
}));

import {
  applyExpoUpdateOnLaunch,
  checkStoreVersionOnLaunch,
  isNewerVersion,
} from "./expo-ota";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("applyExpoUpdateOnLaunch", () => {
  beforeEach(() => {
    vi.stubGlobal("__DEV__", false);
    state.storage.clear();
    state.alert.mockReset();
    state.updates.isEnabled = true;
    state.updates.checkForUpdateAsync.mockReset();
    state.updates.fetchUpdateAsync.mockReset();
    state.updates.reloadAsync.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips in development", async () => {
    vi.stubGlobal("__DEV__", true);
    await applyExpoUpdateOnLaunch(1_000_000);
    expect(state.updates.checkForUpdateAsync).not.toHaveBeenCalled();
  });

  it("downloads updates and prompts to restart at most once every 7 days", async () => {
    state.updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true });
    state.updates.fetchUpdateAsync.mockResolvedValue({ isNew: true });

    const t0 = 1_700_000_000_000;
    await applyExpoUpdateOnLaunch(t0);
    expect(state.updates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
    expect(state.alert).toHaveBeenCalledTimes(1);
    expect(state.updates.reloadAsync).not.toHaveBeenCalled();

    // Tapping "Restart now" calls reloadAsync.
    const buttons = state.alert.mock.calls[0]![2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === "Restart now")?.onPress?.();
    expect(state.updates.reloadAsync).toHaveBeenCalledTimes(1);

    // Within 7 days: still fetches, does not re-prompt.
    await applyExpoUpdateOnLaunch(t0 + 3 * DAY_MS);
    expect(state.updates.fetchUpdateAsync).toHaveBeenCalledTimes(2);
    expect(state.alert).toHaveBeenCalledTimes(1);

    // After 7 days: prompts again.
    await applyExpoUpdateOnLaunch(t0 + 7 * DAY_MS);
    expect(state.alert).toHaveBeenCalledTimes(2);
  });

  it("does nothing when the bundle is current", async () => {
    state.updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false });
    await applyExpoUpdateOnLaunch(1_000_000);
    expect(state.updates.fetchUpdateAsync).not.toHaveBeenCalled();
    expect(state.alert).not.toHaveBeenCalled();
  });
});

describe("isNewerVersion", () => {
  it("compares semver strings", () => {
    expect(isNewerVersion("0.4.1", "0.4.0")).toBe(true);
    expect(isNewerVersion("0.5.0", "0.4.9")).toBe(true);
    expect(isNewerVersion("0.4.0", "0.4.0")).toBe(false);
    expect(isNewerVersion("0.3.9", "0.4.0")).toBe(false);
  });
});

describe("checkStoreVersionOnLaunch", () => {
  beforeEach(() => {
    vi.stubGlobal("__DEV__", false);
    state.storage.clear();
    state.alert.mockReset();
    state.openURL.mockReset();
    state.fetchWithTimeout.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prompts once per 7 days when a newer App Store version exists", async () => {
    state.fetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({
        latestVersion: "0.5.0",
        iosStoreUrl: "itms-apps://apps.apple.com/app/id6822939070",
      }),
    });

    const t0 = 1_700_000_000_000;
    await checkStoreVersionOnLaunch(t0);
    expect(state.alert).toHaveBeenCalledTimes(1);

    const buttons = state.alert.mock.calls[0]![2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === "Update")?.onPress?.();
    expect(state.openURL).toHaveBeenCalledWith("itms-apps://apps.apple.com/app/id6822939070");

    // Suppressed within 7 days for same version.
    await checkStoreVersionOnLaunch(t0 + 2 * DAY_MS);
    expect(state.alert).toHaveBeenCalledTimes(1);

    // Prompts again after 7 days.
    await checkStoreVersionOnLaunch(t0 + 7 * DAY_MS);
    expect(state.alert).toHaveBeenCalledTimes(2);
  });

  it("stays silent when on the latest version", async () => {
    state.fetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({ latestVersion: "0.4.0" }),
    });
    await checkStoreVersionOnLaunch(1_000_000);
    expect(state.alert).not.toHaveBeenCalled();
  });
});
