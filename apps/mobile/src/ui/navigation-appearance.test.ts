import { createElement, useEffect } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { getAppColors } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ mode: "dark" as "light" | "dark" }));
vi.mock("../appearance", () => ({ useAppTheme: () => ({ mode: mock.mode, colors: getAppColors(mock.mode) }) }));
vi.mock("expo-router", () => ({
  DarkTheme: { dark: true, colors: { background: "black" } },
  DefaultTheme: { dark: false, colors: { background: "white" } },
  ThemeProvider: "NavigationProvider",
}));
import { NavigationAppearance } from "./navigation-appearance";
it("updates native navigation surfaces with appearance without remounting screens", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const mounted = vi.fn();
  function Screen() { useEffect(mounted, []); return null; }
  let tree!: ReactTestRenderer;
  try {
    await act(async () => { tree = create(createElement(NavigationAppearance, null, createElement(Screen))); });
    for (const mode of ["dark", "light", "dark"] as const) {
      mock.mode = mode;
      await act(async () => tree.update(createElement(NavigationAppearance, null, createElement(Screen))));
      const theme = tree.root.findByType("NavigationProvider" as never).props.value;
      expect(theme.dark).toBe(mode === "dark");
      expect(theme.colors).toMatchObject({ background: getAppColors(mode).paper, card: getAppColors(mode).card, text: getAppColors(mode).ink });
    }
    expect(mounted).toHaveBeenCalledOnce();
  } finally { if (tree) await act(async () => tree.unmount()); vi.unstubAllGlobals(); }
});
