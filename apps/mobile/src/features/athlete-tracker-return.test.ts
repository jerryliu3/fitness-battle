import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";

const mock = vi.hoisted(() => ({
  params: {} as Record<string, string | undefined>,
  dispatch: vi.fn(),
  replace: vi.fn(),
  setParams: vi.fn(),
}));
vi.mock("react-native", () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Switch: "Switch",
  Text: "Text",
  View: "View",
}));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));
vi.mock("expo-router", () => ({
  useLocalSearchParams: () => mock.params,
  useRouter: () => ({ replace: mock.replace, setParams: mock.setParams }),
}));
vi.mock("heroui-native/button", () => ({ Button: "Button" }));
vi.mock("heroui-native/input", () => ({ Input: "Input" }));
vi.mock("../lib/auth", () => ({
  useAuth: () => ({ user: { id: "alice" }, offlineMode: true }),
}));
vi.mock("../lib/compete-store", () => ({
  useCompeteStore: () => ({ state: freshState(), dispatch: mock.dispatch }),
}));
vi.mock("../lib/device-health", () => ({
  createAppleHealthDeps: vi.fn(),
  createHealthConnectDeps: vi.fn(),
  syncAppleHealth: vi.fn(),
  syncHealthConnect: vi.fn(),
}));
vi.mock("../lib/platform-providers", () => ({ providersForDevice: () => [] }));
vi.mock("../lib/tracker-connect", () => ({
  isCloudOAuthProvider: (id: string) => id === "strava",
  startCloudTrackerConnect: vi.fn(),
}));
vi.mock("./account-actions", () => ({ AccountActions: "AccountActions" }));
vi.mock("./athlete-metrics", () => ({ AthleteMetrics: "AthleteMetrics" }));
vi.mock("./data-sync-actions", () => ({ DataSyncActions: "DataSyncActions" }));
vi.mock("../ui/screen-header", () => ({ ScreenHeader: "ScreenHeader" }));
vi.mock("../ui/integration-icon", () => ({ IntegrationIcon: "IntegrationIcon" }));
vi.mock("../ui/settings-row", () => ({ SettingsRow: "SettingsRow" }));
vi.mock("../ui/focus", () => ({
  FocusButton: "Button",
  FocusSegments: "Segments",
  FocusSheet: "Sheet",
  FocusTextButton: "TextButton",
  f: {},
}));
import AthleteScreen from "../../app/athlete";
let renderer: ReactTestRenderer;
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
describe("tracker callback consumption", () => {
  it.each([undefined, "connections"])(
    "consumes the callback with panel=%s so it cannot reconnect on remount",
    async (panel) => {
      vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
      mock.params = { panel, tracker: "connected", provider: "strava" };
      await act(async () => {
        renderer = create(createElement(AthleteScreen));
      });
      if (!panel) {
        expect(mock.dispatch).not.toHaveBeenCalled();
        expect(mock.replace).toHaveBeenCalledWith({
          pathname: "/athlete-settings",
          params: {
            panel: "connections",
            tracker: "connected",
            provider: "strava",
          },
        });
        mock.params = { ...mock.params, panel: "connections" };
        await act(async () => renderer.unmount());
        await act(async () => {
          renderer = create(createElement(AthleteScreen));
        });
      }
      expect(mock.dispatch).toHaveBeenCalledTimes(1);
      expect(mock.setParams).toHaveBeenCalledWith({
        tracker: undefined,
        provider: undefined,
      });
      expect(JSON.stringify(renderer.toJSON())).toContain("strava connected.");
      mock.params = { panel: "connections" };
      await act(async () => renderer.unmount());
      await act(async () => {
        renderer = create(createElement(AthleteScreen));
      });
      expect(mock.dispatch).toHaveBeenCalledTimes(1);
    },
  );
});
