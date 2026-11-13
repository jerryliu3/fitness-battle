import { beforeEach, describe, expect, it, vi } from "vitest";

const device = vi.hoisted(() => ({ isDevice: false }));
vi.mock("expo-device", () => device);
vi.mock("expo-constants", () => ({
  default: { expoConfig: { extra: {} } },
}));

describe("mobileEnv apiUrl", () => {
  beforeEach(() => {
    device.isDevice = false;
    vi.resetModules();
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it("keeps localhost on simulators", async () => {
    process.env.EXPO_PUBLIC_API_URL = "http://localhost:3000";
    const { mobileEnv } = await import("./env");
    expect(mobileEnv.apiUrl).toBe("http://localhost:3000");
  });

  it("uses production on physical devices when configured with localhost", async () => {
    device.isDevice = true;
    process.env.EXPO_PUBLIC_API_URL = "http://localhost:3000";
    const { mobileEnv, DEFAULT_PRODUCTION_API_URL } = await import("./env");
    expect(mobileEnv.apiUrl).toBe(DEFAULT_PRODUCTION_API_URL);
  });
});
