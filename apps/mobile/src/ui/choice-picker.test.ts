import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
  Platform: { OS: "ios" },
  View: "View",
  Text: "Text",
  Modal: "Modal",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (v: unknown) => v, hairlineWidth: 1, absoluteFill: {} },
}));
vi.mock("./focus", () => ({ f: { row: {}, input: {} } }));
vi.mock("../lib/haptics", () => ({ playCue: vi.fn() }));
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
