import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";

const mock = vi.hoisted(() => ({
  params: {} as Record<string, string | undefined>,
  dispatch: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
  setParams: vi.fn(),
}));
vi.mock("react-native", () => ({
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
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
  useRouter: () => ({
    replace: mock.replace,
    push: mock.push,
    back: mock.back,
    setParams: mock.setParams,
    canGoBack: () => true,
  }),
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
vi.mock("./legal-links", () => ({ LegalLinks: "LegalLinks" }));
vi.mock("./athlete-metrics", () => ({ AthleteMetrics: "AthleteMetrics" }));
vi.mock("./profile-photo", () => ({ ProfilePhoto: "ProfilePhoto" }));
vi.mock("./data-sync-actions", () => ({ DataSyncActions: "DataSyncActions" }));
vi.mock("../ui/screen-header", () => ({ ScreenHeader: "ScreenHeader" }));
vi.mock("../ui/sport-icon", () => ({ SportIcon: "SportIcon" }));
vi.mock("../ui/integration-icon", () => ({ IntegrationIcon: "IntegrationIcon" }));
vi.mock("../ui/choice-picker", () => ({ ChoicePicker: "ChoicePicker" }));
vi.mock("../ui/settings-row", () => ({ SettingsRow: "SettingsRow" }));
vi.mock("../ui/focus", () => ({
  FocusButton: "Button",
  FocusSegments: "Segments",
  FocusSheet: "Sheet",
  FocusSidePanel: "SidePanel",
  FocusTextButton: "TextButton",
  f: {},
  useFocusStyles: () => ({}),
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

describe("athlete profile navigation and layout", () => {
  it("opens edit profile side panel when edit=1 param is set", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mock.params = { edit: "1" };
    await act(async () => {
      renderer = create(createElement(AthleteScreen));
    });
    const sidePanel = renderer.root.findByType("SidePanel" as never);
    expect(sidePanel.props.open).toBe(true);
  });

  it("subpanel back button returns to /athlete with edit=1", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mock.params = { panel: "connections" };
    await act(async () => {
      renderer = create(createElement(AthleteScreen));
    });
    const screenHeader = renderer.root.findByType("ScreenHeader" as never);
    expect(screenHeader.props.title).toBe("Data Sync");
    await act(async () => {
      screenHeader.props.onBack();
    });
    expect(mock.replace).toHaveBeenCalledWith({
      pathname: "/athlete",
      params: { edit: "1" },
    });
  });

  it("renders lifetime overtakes in the athlete stats section", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mock.params = {};
    await act(async () => {
      renderer = create(createElement(AthleteScreen));
    });
    const rendered = JSON.stringify(renderer.toJSON());
    expect(rendered).toContain("Overtakes");
    expect(rendered).toContain("Since the first mile");
  });
});
