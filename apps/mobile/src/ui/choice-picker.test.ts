import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({useColorScheme: () => "light",
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
  Platform: { OS: "ios" },
  View: "View",
  Text: "Text",
  Modal: "Modal",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (v: unknown) => v, hairlineWidth: 1, absoluteFill: {} },
}));
vi.mock("./focus", () => ((()=>{const mock={ f: { row: {}, input: {} } };return {...mock,useFocusStyles:()=>("f" in mock ? mock.f : {})};})()));
vi.mock("react-native-svg", () => ({ default: "Svg", Path: "Path" }));
vi.mock("../lib/haptics", () => ({ playCue: vi.fn() }));
vi.mock("./system-choice", () => ({ SystemChoice: "SystemChoice" }));
import { ScopedThemeProvider } from "../appearance";
import { getAppColors } from "@fitness-battle/shared";
import { AnchoredMenuItem } from "./anchored-menu";
import { ChoicePicker } from "./choice-picker";
let renderer: ReactTestRenderer;
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});
it("opens dropdown on press and selects an option", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const change = vi.fn();
  await act(async () => {
    renderer = create(
      createElement(ChoicePicker, {
        systemMenu: false,
        label: "Sport",
        value: "running",
        options: [
          { value: "running", label: "Running" },
          { value: "cycling", label: "Cycling" },
        ],
        onChange: change,
      }),
    );
  });
  // Press trigger to open dropdown
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: "Sport: Running" }).props.onPress();
  });
  // Find cycling option and select it
  const cyclingOption = renderer.root.findByProps({ accessibilityLabel: "Cycling" });
  await act(async () => {
    cyclingOption.props.onPress();
  });
  expect(change).toHaveBeenCalledWith("cycling");
});


it.each(["light", "dark"] as const)("keeps native and fallback choice labels readable in %s", async mode => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const colors = getAppColors(mode);
  const props = { label: "Gender", value: "male", options: [{ value: "male", label: "Male" }, { value: "female", label: "Female" }], onChange: vi.fn() };
  const content = (native: boolean) => createElement(ScopedThemeProvider, { mode, children: createElement(ChoicePicker, { ...props, systemMenu: native }) });
  await act(async () => { renderer = create(content(true)); });
  expect(renderer.root.findByType("SystemChoice" as never).props.dark).toBe(mode === "dark");
  const color = (style: unknown): string | undefined => Array.isArray(style) ? style.reduce((value, item) => color(item) ?? value, undefined) : (style as { color?: string } | undefined)?.color;
  expect(color(renderer.root.findByType("Text" as never).props.style)).toBe(colors.ink);
  await act(async () => renderer.update(content(false)));
  await act(async () => renderer.root.findByProps({ accessibilityLabel: "Gender: Male" }).props.onPress());
  for (const text of renderer.root.findAllByType("Text" as never)) expect(color(text.props.style)).toBe(colors.ink);
  await act(async () => renderer.update(createElement(ScopedThemeProvider, { mode, children: createElement(AnchoredMenuItem, { label: "Time zone", onPress: vi.fn() }) })));
  expect(color(renderer.root.findByType("Text" as never).props.style)).toBe(colors.ink);
});
