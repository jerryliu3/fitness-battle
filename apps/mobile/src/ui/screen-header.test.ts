import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
const platform = vi.hoisted(() => ({ OS: "ios", Version: 26 }));
vi.mock("react-native", () => ({ Platform: platform, View: "View", Text: "Text", StyleSheet: { create: (v: unknown) => v } }));
vi.mock("./icon-button", () => ({ IconButton: "IconButton" }));
vi.mock("./focus", () => ({ f: { row: {} }, useFocusStyles: () => ({ row: {} }) }));
vi.mock("expo-router/react-navigation", () => ({ useHeaderHeight: () => 100 }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 44 }) }));
vi.mock("expo-router", () => ({ Stack: {
  Screen: (props: object) => createElement("NativeScreen", props),
  Toolbar: Object.assign((props: object) => createElement("Toolbar", props), { Button: (props: object) => createElement("ToolbarButton", props) }),
} }));
import { ScreenHeader } from "./screen-header";
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); platform.OS = "ios"; });
it("uses native iOS glass toolbar items, retains Back action and reserves measured bar height", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const back = vi.fn();
  await act(async () => { renderer = create(createElement(ScreenHeader, { title: "Preferences", onBack: back, localBack: true })); });
  const screen = renderer.root.find(node => (node.type as unknown) === "NativeScreen");
  expect(screen.props.options).toMatchObject({ headerShown: true, headerBackVisible: false, gestureEnabled: false });
  expect(screen.props.options.headerStyle).toBeUndefined();
  expect(screen.props.options.headerBlurEffect).toBeUndefined();
  renderer.root.find(node => (node.type as unknown) === "ToolbarButton").props.onPress();
  expect(back).toHaveBeenCalledOnce();
  expect(renderer.root.find(node => (node.type as unknown) === "View").props.style.height).toBe(56);
});
it("keeps the existing shared header on Android", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); platform.OS = "android";
  await act(async () => { renderer = create(createElement(ScreenHeader, { title: "Preferences", onBack: vi.fn() })); });
  expect(renderer.root.findAll(node => (node.type as unknown) === "NativeScreen")).toHaveLength(0);
  expect(renderer.root.findAll(node => (node.type as unknown) === "IconButton")).toHaveLength(1);
});
