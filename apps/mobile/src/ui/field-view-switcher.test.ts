import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ View: "View", Text: "Text", Pressable: "Pressable" }));
vi.mock("./anchored-menu", () => ({
  AnchoredMenu: ({ children }: { children: unknown }) => children,
  useAnchoredMenu: () => ({ open: true, close: vi.fn(), toggle: vi.fn(), anchorRef: { current: null }, menuLayout: null }),
}));
vi.mock("./section", () => ({ textStyle: () => ({}) }));
vi.mock("../lib/haptics", () => ({ playCue: () => {} }));
import { FieldViewSwitcher } from "./field-view-switcher";

it("offers the course as 3D for distance fields and marks the chosen view without offering it for points", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onChange = vi.fn(); let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(createElement(FieldViewSwitcher, { value: "4d", geographic: true, onChange })); });
    const buttons = renderer.root.findAllByType("Pressable" as never);
    const trigger = buttons.find((b: { props: { accessibilityLabel?: string } }) => b.props.accessibilityLabel === "Dimension: 3D");
    expect(trigger).toBeDefined();

    const option2D = buttons.find((b: { props: { accessibilityLabel?: string } }) => b.props.accessibilityLabel === "Select 2D");
    const option3D = buttons.find((b: { props: { accessibilityLabel?: string } }) => b.props.accessibilityLabel === "Select 3D");
    const option4D = buttons.find((b: { props: { accessibilityLabel?: string } }) => b.props.accessibilityLabel === "Select 4D");
    expect(option2D).toBeDefined();
    expect(option3D?.props.accessibilityState.selected).toBe(true);
    await act(async () => option3D!.props.onPress());
    expect(onChange).toHaveBeenCalledWith("4d");
    expect(option4D).toBeUndefined();

    await act(async () => option2D!.props.onPress());
    expect(onChange).toHaveBeenCalledWith("2d");

    await act(async () => renderer.update(createElement(FieldViewSwitcher, { value: "2d", geographic: false, onChange })));
    const updatedButtons = renderer.root.findAllByType("Pressable" as never);
    expect(updatedButtons.find((b: { props: { accessibilityLabel?: string } }) => b.props.accessibilityLabel === "Select 3D")).toBeUndefined();
  } finally { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); }
});
