import { afterEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  platform: { OS: "web" },
  createClient: vi.fn((..._args: unknown[]) => ({})),
  storage: {
    getItem: vi.fn(() => {
      throw new Error("Storage cannot run during export");
    }),
  },
}));
vi.mock("react-native-url-polyfill/auto", () => ({}));
vi.mock("react-native", () => ({ Platform: mock.platform }));
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
});
