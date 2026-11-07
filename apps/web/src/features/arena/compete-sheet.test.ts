import { createElement, useEffect } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { CompeteSheet } from "./compete-sheet";

it("snaps by drag and keyboard, preserves content while minimized and across tab changes", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let mounts = 0;
  function Content() { useEffect(() => { mounts++; }, []); return createElement("div", null, "Standings rows"); }
  const props = { active: true, children: createElement(Content) };
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(createElement(CompeteSheet, props), { createNodeMock: node => node.type === "section" ? { offsetHeight: 800 } : null }); });
  try {
    const panel = () => renderer.root.findByType("section");
    const handle = () => renderer.root.findByProps({ role: "slider" });
    expect(panel().props["data-stop"]).toBe(1);
    await act(async () => handle().props.onPointerDown({ clientY: 450, pointerId: 1, currentTarget: { setPointerCapture() {} } }));
    await act(async () => handle().props.onPointerUp({ clientY: 50 }));
    expect(panel().props["data-stop"]).toBe(2);
    await act(async () => handle().props.onKeyDown({ key: "ArrowDown", preventDefault() {} }));
    expect(panel().props["data-stop"]).toBe(1);
    await act(async () => handle().props.onKeyDown({ key: "ArrowDown", preventDefault() {} }));
    expect(renderer.root.findAllByType("button")).toHaveLength(0);
    expect(panel().props["data-stop"]).toBe(0);
    await act(async () => renderer.update(createElement(CompeteSheet, { ...props, active: false })));
    expect(panel().props.inert).toBe(true);
    await act(async () => renderer.update(createElement(CompeteSheet, props)));
    expect(mounts).toBe(1);
    expect(panel().props["data-stop"]).toBe(0);
  } finally { await act(async () => renderer.unmount()); vi.unstubAllGlobals(); }
});
