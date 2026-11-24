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
  canGoBackValue: true,
  user: { id: "alice" } as { id: string } | null,
}));
vi.mock("react-native", () => ({useColorScheme: () => "light",  AppState: { currentState: "active", addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
  Platform: { OS: "ios" },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
  StyleSheet: { create: (styles: unknown) => styles },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Switch: "Switch",
  Text: "Text",
  TextInput: "TextInput",
  View: "View",
  Clipboard: { setString: vi.fn() },
}));
vi.mock("../lib/env", () => ({
  mobileEnv: { apiUrl: "https://example.test" },
  publicProfileOrigin: (apiUrl: string) =>
    apiUrl.includes("localhost") ? apiUrl.replace(/\/$/, "") : "https://overtaek.xyz",
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
    canGoBack: () => mock.canGoBackValue,
  }),
}));
vi.mock("heroui-native/button", () => ({ Button: "Button" }));
vi.mock("heroui-native/input", () => ({ Input: "Input" }));
vi.mock("heroui-native/card", () => {
  const Card: any = () => null;
  Card.Header = () => null;
  Card.Body = () => null;
  return { Card };
});
vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    user: mock.user,
    offlineMode: true,
    signInWithGoogle: vi.fn(),
    signInWithApple: vi.fn(),
  }),
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
const providersMock = vi.hoisted(() => ({
  list: [] as { id: string; name: string }[],
}));
vi.mock("../lib/platform-providers", () => ({
  providersForDevice: () => providersMock.list,
}));
vi.mock("../lib/tracker-connect", () => ({
  isCloudOAuthProvider: (id: string) => id === "strava",
  startCloudTrackerConnect: vi.fn(),
}));
vi.mock("./account-actions", () => ({ AccountActions: "AccountActions" }));
vi.mock("./legal-links", () => ({ LegalLinks: "LegalLinks" }));
vi.mock("./social-auth-buttons", () => ({ SocialAuthButtons: "SocialAuthButtons" }));
vi.mock("./athlete-metrics", () => ({ AthleteMetrics: "AthleteMetrics" }));
vi.mock("./profile-photo", () => ({ ProfilePhoto: "ProfilePhoto" }));
vi.mock("./athlete-crest", () => ({ AthleteCrest: "AthleteCrest" }));
vi.mock("./data-sync-actions", () => ({ DataSyncActions: "DataSyncActions" }));
vi.mock("./sync-review", () => ({ SyncReview: "SyncReview" }));
vi.mock("../ui/toast", () => ({ Toast: (props: any) => props.message ? createElement("Toast", props, props.message) : null }));
vi.mock("../ui/screen-header", () => ({ ScreenHeader: "ScreenHeader", GlassDismissButton: "GlassDismissButton" }));
vi.mock("../ui/sport-icon", () => ({ SportIcon: "SportIcon" }));
vi.mock("../ui/rank-symbol", () => ({ RankSymbol: "RankSymbol" }));
vi.mock("../ui/integration-icon", () => ({ IntegrationIcon: "IntegrationIcon" }));
vi.mock("../ui/app-icon", () => ({ AppIcon: "AppIcon" }));
vi.mock("../ui/choice-picker", () => ({ ChoicePicker: "ChoicePicker" }));
vi.mock("../ui/settings-row", () => ({ SettingsRow: "SettingsRow" }));
vi.mock("../ui/focus", () => ((()=>{const mock={
  FocusButton: "Button",
  FocusSegments: "Segments",
  FocusSheet: "Sheet",
  FocusSidePanel: "SidePanel",
  FocusTextButton: "TextButton",
  f: {},
};return {...mock,useFocusStyles:()=>("f" in mock ? mock.f : {})};})()));
import AthleteScreen, { TrackerConnections } from "../../app/athlete";
let renderer: ReactTestRenderer;
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  mock.user = { id: "alice" };
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
      const toast = renderer.root.findByType("Toast" as never);
      expect(String(toast.props.message)).toContain("strava connected.");
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
  it("opens settings side panel when edit=1 param is set", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mock.params = { edit: "1" };
    await act(async () => {
      renderer = create(createElement(AthleteScreen));
    });
    const sidePanel = renderer.root
      .findAllByType("SidePanel" as never)
      .find((node) => node.props.title === "Settings");
    expect(sidePanel?.props.open).toBe(true);
  });

  it("subpanel back button calls router.back() when canGoBack is true", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mock.params = { panel: "connections" };
    mock.canGoBackValue = true;
    await act(async () => {
      renderer = create(createElement(AthleteScreen));
    });
    const screenHeader = renderer.root.findByType("ScreenHeader" as never);
    expect(screenHeader.props.title).toBe("Data Sync");
    await act(async () => {
      screenHeader.props.onBack();
    });
    expect(mock.back).toHaveBeenCalled();
  });

  it("Data Sync uses secondary Connect rows and no header dismiss control", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    providersMock.list = [
      { id: "apple_health", name: "Apple Health" },
      { id: "strava", name: "Strava" },
    ];
    mock.params = { panel: "connections" };
    await act(async () => {
      renderer = create(createElement(AthleteScreen));
    });
    const screenHeader = renderer.root.findByType("ScreenHeader" as never);
    expect(screenHeader.props.trailing).toBeUndefined();
    const buttons = renderer.root.findAllByType("Button" as never);
    const connect = buttons.find((node) => node.props.label === "Connect");
    expect(connect?.props.secondary).toBe(true);
    providersMock.list = [];
  });

  it("subpanel back button returns to /athlete with edit=1 when cannot go back", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mock.params = { panel: "connections" };
    mock.canGoBackValue = false;
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

  it("renders profile link row with achievements below crest", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mock.params = {};
    await act(async () => {
      renderer = create(createElement(AthleteScreen));
    });
    const rendered = JSON.stringify(renderer.toJSON());
    expect(rendered).toContain("AthleteCrest");
    expect(renderer.root.findByType("ScreenHeader" as never).props.localBack).toBe(true);
    expect(rendered).toContain("Achievements");
    expect(rendered).not.toContain("Primary sport");
  });

  it("renders shareable profile link row with copy and edit profile", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mock.params = {};
    await act(async () => {
      renderer = create(createElement(AthleteScreen));
    });
    const rendered = JSON.stringify(renderer.toJSON());
    expect(rendered).toContain("https://overtaek.xyz/athlete?id=alice");
    expect(rendered).toContain("Copy");
    expect(rendered).toContain("Edit profile");
    expect(rendered).toContain("Settings");
  });

  it("opens edit profile as a routed panel with the identity editor", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mock.params = { panel: "profile" };
    await act(async () => {
      renderer = create(createElement(AthleteScreen));
    });
    const screenHeader = renderer.root.findByType("ScreenHeader" as never);
    expect(screenHeader.props.title).toBe("Edit profile");
    const rendered = JSON.stringify(renderer.toJSON());
    expect(rendered).not.toContain("AthleteCrest");
    expect(rendered).not.toContain("Identity");
  });

  it("renders signed out athlete page without guest profile row, auth mode tabs, or display name input", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mock.params = {};
    mock.user = null;
    await act(async () => {
      renderer = create(createElement(AthleteScreen));
    });
    const rendered = JSON.stringify(renderer.toJSON());
    expect(rendered).toContain("Sign in to Overtaek");
    expect(rendered).toContain("and join events.");
    expect(rendered).not.toContain("keep your battles on this device");
    expect(rendered).not.toContain("Create account");
    expect(rendered).not.toContain("Display name");

    expect(renderer.root.findAllByType("AthleteMetrics" as never)).toHaveLength(0);
  });
});


describe("onboarding sign-in", () => {
  it.each([true, false])("returns to onboarding with a visible Back control (history=%s)", async (history) => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mock.user = null;
    mock.params = { auth: "signin", from: "onboarding" };
    mock.canGoBackValue = history;
    await act(async () => { renderer = create(createElement(AthleteScreen)); });
    const header = renderer.root.findByType("ScreenHeader" as never);
    expect(header.props.localBack).toBe(true);
    expect(header.props.title).toBe("Sign in");
    expect(renderer.root.findAllByType("AthleteMetrics" as never)).toHaveLength(0);
    await act(async () => header.props.onBack());
    if (history) expect(mock.back).toHaveBeenCalled();
    else expect(mock.replace).toHaveBeenCalledWith("/welcome");
    mock.canGoBackValue = true;
  });
});

it("keeps onboarding tracker connections free of file-import and recap actions", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); mock.user = { id: "alice" };
  await act(async () => { renderer = create(createElement(TrackerConnections)); });
  expect(renderer.root.findAllByType("DataSyncActions" as never).some(node => !node.props.provider)).toBe(false);
});

it("lists the same providers in a signed-out onboarding preview without offering a connection", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.user = null;
  mock.params = {};
  providersMock.list = [{ id: "strava", name: "Strava" }];
  try {
    await act(async () => { renderer = create(createElement(TrackerConnections, { preview: true })); });
    expect(renderer.root.findByType("IntegrationIcon" as never).props.provider).toBe("strava");
    const connect = renderer.root.findAllByType("Button" as never).find(node => node.props.label === "Connect")!;
    expect(connect.props.disabled).toBe(true);
    await act(async () => connect.props.onPress());
    expect(mock.dispatch).not.toHaveBeenCalled();
    expect(mock.replace).not.toHaveBeenCalled();
  } finally {
    providersMock.list = [];
  }
});
