import { afterEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  platform: { OS: "web" },
  startAutoRefresh: vi.fn(),
  stopAutoRefresh: vi.fn(),
  appStateListener: null as null | ((state: string) => void),
  createClient: vi.fn((..._args: unknown[]) => ({
    auth: {
      startAutoRefresh: () => mock.startAutoRefresh(),
      stopAutoRefresh: () => mock.stopAutoRefresh(),
    },
  })),
  storage: {
    getItem: vi.fn(() => {
      throw new Error("Storage cannot run during export");
    }),
  },
}));
vi.mock("react-native-url-polyfill/auto", () => ({}));
vi.mock("react-native", () => ({
  Platform: mock.platform,
  AppState: {
    addEventListener: vi.fn((_type: string, handler: (state: string) => void) => {
      mock.appStateListener = handler;
      return { remove: vi.fn() };
    }),
  },
}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: mock.storage,
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mock.createClient }));
vi.mock("./env", () => ({
  mobileEnv: {
    supabaseUrl: "https://test.supabase.co",
    supabaseAnonKey: "public-test-key",
  },
}));
afterEach(() => {
  mock.appStateListener = null;
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
describe("Expo auth persistence", () => {
  it.each([
    ["web", false, false],
    ["web", true, true],
    ["ios", false, true],
    ["android", false, true],
  ] as const)(
    "configures %s with window=%s without touching storage",
    async (platform, hasWindow, persists) => {
      mock.platform.OS = platform;
      vi.stubGlobal("window", hasWindow ? {} : undefined);
      await import("./supabase");
      const options = mock.createClient.mock.calls[0]![2] as {
        auth: Record<string, unknown>;
      };
      expect(options.auth.persistSession).toBe(persists);
      expect(options.auth.autoRefreshToken).toBe(persists);
      expect(options.auth.storage).toBe(persists ? mock.storage : undefined);
      expect(mock.storage.getItem).not.toHaveBeenCalled();
    },
  );

  it("pauses auto-refresh on background and resumes on active on native", async () => {
    mock.platform.OS = "ios";
    await import("./supabase");
    expect(mock.appStateListener).toBeTypeOf("function");
    mock.appStateListener!("background");
    expect(mock.stopAutoRefresh).toHaveBeenCalledTimes(1);
    expect(mock.startAutoRefresh).not.toHaveBeenCalled();
    mock.appStateListener!("active");
    expect(mock.startAutoRefresh).toHaveBeenCalledTimes(1);
  });
});
