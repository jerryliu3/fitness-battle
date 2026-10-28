import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { defaultFieldAppearance } from "@fitness-battle/shared";
vi.mock("react-native", () => ({ View: "View", Text: "Text", Pressable: "Pressable", ScrollView: "ScrollView" }));
vi.mock("./anchored-menu", () => ({
  AnchoredMenu: ({ children }: { children: unknown }) => children,
  useAnchoredMenu: () => ({ open: true, close: vi.fn(), toggle: vi.fn(), anchorRef: { current: null }, menuLayout: null }),
}));
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
    const buttons = renderer.root.findAllByType("Pressable" as never);
    expect(buttons.length).toBeGreaterThan(1);
    await act(async () => buttons[1].props.onPress());
    expect(onChangeAppearance).toHaveBeenCalled();
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    vi.unstubAllGlobals();
  }
});
