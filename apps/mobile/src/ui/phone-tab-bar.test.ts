import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  Pressable: "Pressable",
  Text: "Text",
  View: "View",
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock("react-native-svg", () => ({ default: "Svg", Path: "Path" }));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));
vi.mock("../lib/haptics", () => ({ playCue: vi.fn() }));
import { PhoneTabBar } from "./phone-tab-bar";

let renderer: ReactTestRenderer;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});

async function setup(prevented = false) {
  const state = {
    index: 0,
    routes: [
      { name: "today", key: "home" },
      { name: "arena", key: "compete" },
    ],
  };
  const navigation = {
    navigate: vi.fn(),
    emit: vi.fn(() => ({ type: "tabPress", defaultPrevented: prevented })),
  };
  await act(async () => {
    renderer = create(createElement(PhoneTabBar, { state, navigation }));
  });
  return {
    navigation,
    tabs: renderer.root.findAllByType("Pressable" as never),
  };
}

describe("native tab navigation", () => {
  it("emits a cancellable tab press before navigating", async () => {
    const { navigation, tabs } = await setup();
    await act(async () => tabs[1]!.props.onPress());
    expect(navigation.emit).toHaveBeenCalledWith({
      type: "tabPress",
      target: "compete",
      canPreventDefault: true,
    });
    expect(navigation.navigate).toHaveBeenCalledExactlyOnceWith("arena");
    // Selection follows the navigator, even when a transition is delayed.
    expect(tabs[0]!.props.accessibilityState.selected).toBe(true);
  });
  it("respects a prevented navigation", async () => {
    const { navigation, tabs } = await setup(true);
    await act(async () => tabs[1]!.props.onPress());
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
  it("emits retaps and long presses without duplicate navigation", async () => {
    const { navigation, tabs } = await setup();
    await act(async () => {
      tabs[0]!.props.onPress();
      tabs[1]!.props.onLongPress();
    });
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(navigation.emit).toHaveBeenCalledWith({
      type: "tabLongPress",
      target: "compete",
    });
  });
});
