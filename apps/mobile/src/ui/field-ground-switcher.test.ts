import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { defaultFieldAppearance } from "@fitness-battle/shared";
vi.mock("react-native", () => ({useColorScheme: () => "light",  View: "View", Text: "Text", Pressable: "Pressable", ScrollView: "ScrollView" }));
vi.mock("./course-options", () => ({
  LayersMenu: ({ children }: { children: (context: { close: () => void }) => unknown }) => children({ close: vi.fn() }),
}));
vi.mock("./anchored-menu", () => ({ AnchoredMenuItem: "AnchoredMenuItem" }));
vi.mock("./section", () => ({ textStyle: () => ({}) }));
vi.mock("../lib/haptics", () => ({ playCue: () => {} }));
import { FieldGroundSwitcher } from "./field-ground-switcher";

it("renders current ground and switches ground on press", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onChangeAppearance = vi.fn();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(createElement(FieldGroundSwitcher, { appearance: defaultFieldAppearance, onChangeAppearance }));
    });
    const choices = renderer.root.findAllByType("AnchoredMenuItem" as never);
    expect(choices.find(node => node.props.selected)?.props.label).toBe("Meadow Trail");
    await act(async () => choices.find(node => node.props.label === "Night Meet")!.props.onPress());
    expect(onChangeAppearance).toHaveBeenCalledWith({ ...defaultFieldAppearance, ground: "night" });
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    vi.unstubAllGlobals();
  }
});
