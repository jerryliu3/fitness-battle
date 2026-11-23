import { beforeEach, describe, expect, it, vi } from "vitest";

const device = vi.hoisted(() => ({ isDevice: false }));
vi.mock("expo-device", () => device);
const expoExtra = vi.hoisted(() => ({} as Record<string, string>));
vi.mock("expo-constants", () => ({
  default: { expoConfig: { extra: expoExtra } },
}));

describe("mobileEnv apiUrl", () => {
  beforeEach(() => {
    device.isDevice = false;
    vi.resetModules();
    delete process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    for (const key of Object.keys(expoExtra)) delete expoExtra[key];
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

  it("reads hosted Supabase from app.json extra when OTA omits EXPO_PUBLIC_*", async () => {
    const { isSupabaseConfigured } = await import("@fitness-battle/shared");
    expoExtra.supabaseUrl = "https://pxruixccvrykhbjzjqga.supabase.co";
    expoExtra.supabaseAnonKey = "sb_publishable_qDgv-txtSFPU4VatDc1CGQ_2SwG-Po9";
    const { mobileEnv } = await import("./env");
    expect(isSupabaseConfigured(mobileEnv.supabaseUrl, mobileEnv.supabaseAnonKey)).toBe(true);
  });
});

describe("publicProfileOrigin", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("uses overtaek.xyz for non-loopback API hosts", async () => {
    const { publicProfileOrigin, PUBLIC_WEB_ORIGIN } = await import("./env");
    expect(publicProfileOrigin("https://example.test")).toBe(PUBLIC_WEB_ORIGIN);
  });

  it("keeps localhost for local dev", async () => {
    const { publicProfileOrigin } = await import("./env");
    expect(publicProfileOrigin("http://localhost:3000")).toBe("http://localhost:3000");
  });
});
