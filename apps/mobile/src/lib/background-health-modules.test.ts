import { beforeEach, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  platform: "ios",
  modules: new Set<string>(),
  probe: vi.fn(),
}));

vi.mock("expo", () => ({
  requireOptionalNativeModule: (name: string) => {
    native.probe(name);
    return native.modules.has(name) ? {} : null;
  },
}));
vi.mock("react-native", () => ({ Platform: { get OS() { return native.platform; } } }));
vi.mock("./device-health", () => ({ syncAppleHealth: vi.fn(), syncHealthConnect: vi.fn() }));
vi.mock("./supabase", () => ({ supabase: { auth: { getSession: vi.fn() } } }));

beforeEach(() => {
  vi.resetModules();
  native.platform = "ios";
  native.modules.clear();
  native.probe.mockClear();
});

it.each(["ios", "android"])("loads safely on a %s binary without either background native module", async (platform) => {
  native.platform = platform;
  const { backgroundHealthModules } = await import("./background-health-modules");
  expect(backgroundHealthModules).toBeNull();
  expect(native.probe).toHaveBeenCalledWith("ExpoTaskManager");
  // Import the actual startup dependency too: an eager package import here would crash.
  const sync = await import("./background-health-sync");
  expect(await sync.registerBackgroundHealthSync()).toBe(false);
});

it("does not import background-fetch when only task-manager is installed", async () => {
  native.modules.add("ExpoTaskManager");
  const { backgroundHealthModules } = await import("./background-health-modules");
  expect(backgroundHealthModules).toBeNull();
  expect(native.probe).toHaveBeenCalledWith("ExpoBackgroundFetch");
});

it("does not load native background packages on web", async () => {
  native.platform = "web";
  const { backgroundHealthModules } = await import("./background-health-modules");
  expect(backgroundHealthModules).toBeNull();
  expect(native.probe).not.toHaveBeenCalled();
});
