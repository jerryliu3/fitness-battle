import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  params: {} as Record<string, string | undefined>,
  navigate: vi.fn(),
  push: vi.fn(),
  setParams: vi.fn(),
}));
vi.mock("react-native", () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  Image: "Image",
  Pressable: "Pressable",
  Text: "Text",
  View: "View",
}));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));
vi.mock("expo-router", async () => ({
  useFocusEffect: (await import("react")).useEffect,
  useLocalSearchParams: () => mock.params,
  usePathname: () => "/today",
  useRouter: () => ({
    navigate: mock.navigate,
    push: mock.push,
    setParams: mock.setParams,
  }),
}));
vi.mock("../lib/compete-store", () => ({
  useCompeteStore: () => ({ state: null }),
}));
vi.mock("../features/progress-screen", () => ({
  ProgressScreen: "ProgressScreen",
}));
vi.mock("./mascot/ember", () => ({ Ember: "Ember" }));
import ProgressTab from "../../app/(tabs)/you";
import { AppHeader } from "./app-header";
let renderer: ReactTestRenderer;
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
  mock.params = {};
  vi.clearAllMocks();
});
describe("mobile navigation parity", () => {
  it("opens Progress from the existing you tab and Athlete from the header", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    await act(async () => {
      renderer = create(createElement(ProgressTab));
    });
    expect(renderer.root.findByType("ProgressScreen" as never)).toBeTruthy();
    await act(async () => {
      renderer.update(createElement(AppHeader));
    });
    const profile = renderer.root
      .findAllByType("Pressable" as never)
      .find(
        (node) => node.props.accessibilityLabel === "Open athlete settings",
      )!;
    await act(async () => profile.props.onPress());
    expect(mock.navigate).toHaveBeenCalledWith("/athlete");
  });
  it.each([
    { panel: "preferences" },
    { tracker: "connected", provider: "strava" },
  ])("preserves legacy settings and tracker links %s", async (params) => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mock.params = params;
    await act(async () => {
      renderer = create(createElement(ProgressTab));
    });
    expect(mock.setParams).toHaveBeenCalledWith({
      panel: undefined,
      tracker: undefined,
      provider: undefined,
    });
    expect(mock.push).toHaveBeenCalledWith({
      pathname: "/athlete",
      params: {
        panel: undefined,
        tracker: undefined,
        provider: undefined,
        ...params,
      },
    });
    mock.params = {};
    await act(async () => renderer.update(createElement(ProgressTab)));
    expect(renderer.root.findByType("ProgressScreen" as never)).toBeTruthy();
    expect(mock.push).toHaveBeenCalledTimes(1);
  });
});
