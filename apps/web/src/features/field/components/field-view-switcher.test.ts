import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { FieldViewSwitcher } from "./field-view-switcher";
it("preserves every distance view and standings in an accessible dropdown", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onChange = vi.fn(), onStandings = vi.fn(); let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(createElement(FieldViewSwitcher, { value: "4d", geographic: true, onChange, onStandings })); });
    const select = renderer.root.findByType("select");
    expect(select.props["aria-label"]).toBe("Field view");
    expect(select.props.value).toBe("4d");
    expect(renderer.root.findAllByType("option").map(option => option.props.value)).toEqual(["2d", "3d", "4d", "standings"]);
    await act(async () => select.props.onChange({ target: { value: "standings" } }));
    expect(onStandings).toHaveBeenCalledOnce();
    await act(async () => select.props.onChange({ target: { value: "3d" } }));
    expect(onChange).toHaveBeenCalledWith("3d");
    await act(async () => renderer.update(createElement(FieldViewSwitcher, { value: "2d", geographic: false, onChange, standings: true, onStandings })));
    expect(renderer.root.findByType("select").props.value).toBe("standings");
    expect(renderer.root.findAllByType("option").map(option => option.props.value)).toEqual(["2d", "3d", "standings"]);
  } finally { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); }
});

it("exposes camera zoom as dropdown actions without changing the selected view", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onChange = vi.fn(), onZoomIn = vi.fn(), onZoomOut = vi.fn();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(createElement(FieldViewSwitcher, { value: "3d", geographic: false, onChange, onZoomIn, onZoomOut })); });
    const select = renderer.root.findByType("select");
    await act(async () => select.props.onChange({ target: { value: "zoom-in" } }));
    await act(async () => select.props.onChange({ target: { value: "zoom-out" } }));
    expect(onZoomIn).toHaveBeenCalledOnce(); expect(onZoomOut).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled(); expect(select.props.value).toBe("3d");
  } finally { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); }
});
