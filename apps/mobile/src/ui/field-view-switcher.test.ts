import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ View: "View", Text: "Text", Pressable: "Pressable" }));
vi.mock("./section", () => ({ textStyle: () => ({}) }));
import { FieldViewSwitcher } from "./field-view-switcher";
it("offers 4D for distance fields and marks the chosen view without offering it for points", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onChange = vi.fn(); let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(createElement(FieldViewSwitcher, { value: "4d", geographic: true, onChange })); });
    const buttons = renderer.root.findAllByType("Pressable" as never);
    expect(buttons).toHaveLength(3);
    expect(buttons[2].props.accessibilityState.selected).toBe(true);
    await act(async () => buttons[0].props.onPress());
    expect(onChange).toHaveBeenCalledWith("2d");
    await act(async () => renderer.update(createElement(FieldViewSwitcher, { value: "2d", geographic: false, onChange })));
    expect(renderer.root.findAllByType("Pressable" as never)).toHaveLength(2);
  } finally { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); }
});
