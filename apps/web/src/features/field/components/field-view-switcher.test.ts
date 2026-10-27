import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { FieldViewSwitcher } from "./field-view-switcher";
it("offers 4D for distance fields, exposes selection and lets the athlete return to 3D", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onChange = vi.fn(); let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(createElement(FieldViewSwitcher, { value: "4d", geographic: true, onChange })); });
    const buttons = renderer.root.findAllByType("button");
    expect(buttons).toHaveLength(3);
    expect(buttons[2].props["aria-pressed"]).toBe(true);
    await act(async () => buttons[1].props.onClick());
    expect(onChange).toHaveBeenCalledWith("3d");
    await act(async () => renderer.update(createElement(FieldViewSwitcher, { value: "2d", geographic: false, onChange })));
    expect(renderer.root.findAllByType("button")).toHaveLength(2);
  } finally { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); }
});
