import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ View: "View", Text: "Text", Pressable: "Pressable" }));
vi.mock("./choice-picker", () => ({ ChoicePicker: "ChoicePicker" }));
import { FieldViewSwitcher } from "./field-view-switcher";
it("offers 4D for distance fields and marks the chosen view without offering it for points", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onChange = vi.fn(); let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(createElement(FieldViewSwitcher, { value: "4d", geographic: true, onChange })); });
    const picker = () => renderer.root.findByType("ChoicePicker" as never);
    expect(picker().props.value).toBe("4d");
    expect(picker().props.options.map((option: { value: string }) => option.value)).toEqual(["2d", "3d", "4d"]);
    await act(async () => picker().props.onChange("2d"));
    expect(onChange).toHaveBeenCalledWith("2d");
    await act(async () => renderer.update(createElement(FieldViewSwitcher, { value: "2d", geographic: false, onChange })));
    expect(picker().props.options.map((option: { value: string }) => option.value)).toEqual(["2d", "3d"]);
  } finally { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); }
});
