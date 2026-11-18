import { createElement, useEffect } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ pathname: "/today", accountKey: "one", mounts: 0 }));
const state = freshState(new Date("2026-11-18T12:00:00Z"));
vi.mock("../lib/compete-store", () => ({ useCompeteStore: () => ({ state, accountKey: mock.accountKey }) }));
vi.mock("expo-router", () => ({ usePathname: () => mock.pathname, useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]) }));
vi.mock("react-native", () => ({ Platform: { OS: "ios" }, View: "View" }));
vi.mock("./athlete-crest", () => ({ AthleteCrest: (props: object) => { useEffect(() => { mock.mounts++; }, []); return createElement("Scene", props); } }));
import { AthleteCardSlot, RetainedAthleteCard } from "./retained-athlete-card";
it("warms once, retains the scene between visits, clips to the scroll viewport and resets across accounts", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const viewport = { current: { measureInWindow: (fn: Function) => fn(0, 100, 320, 600) } };
  const render = (shown: boolean, active = true) => createElement(RetainedAthleteCard, { children: shown ? createElement(AthleteCardSlot, { viewport: viewport as never, active }) : "Home" });
  let tree!: ReactTestRenderer;
  try {
    await act(async () => { tree = create(render(false), { createNodeMock: () => ({ measureInWindow: (fn: Function) => fn(0, 80, 320, 430) }) }); });
    expect(mock.mounts).toBe(1);
    expect(tree.root.findByType("Scene" as never).props.active).toBe(false);
    mock.pathname = "/athlete";
    await act(async () => tree.update(render(true)));
    expect(tree.root.findByType("Scene" as never).props.active).toBe(true);
    expect(mock.mounts).toBe(1);
    expect(tree.root.findByType("Scene" as never).parent!.parent!.props.style.marginTop).toBe(-20);
    await act(async () => tree.update(render(true, false)));
    expect(tree.root.findByType("Scene" as never).props.active).toBe(false);
    await act(async () => tree.update(render(true)));
    expect(tree.root.findByType("Scene" as never).props.active).toBe(true);
    expect(mock.mounts).toBe(1);
    mock.pathname = "/today";
    await act(async () => tree.update(render(false)));
    expect(tree.root.findByType("Scene" as never).props.active).toBe(false);
    mock.pathname = "/athlete";
    await act(async () => tree.update(render(true)));
    expect(mock.mounts).toBe(1);
    mock.accountKey = "two";
    await act(async () => tree.update(render(true)));
    expect(mock.mounts).toBe(2);
  } finally {
    if (tree) await act(async () => tree.unmount());
    vi.unstubAllGlobals();
  }
});
