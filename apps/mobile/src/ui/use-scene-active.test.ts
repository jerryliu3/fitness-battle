import { createElement, useEffect } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ status: "active", listener: null as null | ((status: string) => void), blur: null as null | (() => void), remove: vi.fn() }));
vi.mock("react-native", () => ({ AppState: { get currentState() { return mock.status; }, addEventListener: (_: string, listener: (s: string) => void) => { mock.listener = listener; return { remove: mock.remove }; } } }));
vi.mock("expo-router", () => ({ useFocusEffect: (effect: () => () => void) => useEffect(() => { mock.blur = effect(); return mock.blur; }, [effect]) }));
import { useSceneActive } from "./use-scene-active";
it("stops retained scenes on inactivity or blur and removes its listener", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let active = false; function Scene() { active = useSceneActive(); return null; }
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(Scene)); }); expect(active).toBe(true);
  await act(async () => { mock.status = "inactive"; mock.listener!("inactive"); }); expect(active).toBe(false);
  await act(async () => { mock.status = "active"; mock.listener!("active"); }); expect(active).toBe(true);
  await act(async () => mock.blur!()); expect(active).toBe(false);
  await act(async () => { mock.status = "background"; mock.listener!("background"); mock.status = "active"; mock.listener!("active"); }); expect(active).toBe(false);
  await act(async () => r.unmount()); expect(mock.remove).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});
