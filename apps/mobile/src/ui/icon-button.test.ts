import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { getAppColors } from "@fitness-battle/shared";
vi.mock("react-native", () => ({ View: "View", Pressable: "Pressable", StyleSheet: { absoluteFill: {}, create: (v: unknown) => v } }));
vi.mock("./app-icon", () => ({ AppIcon: "AppIcon" }));
vi.mock("./material-panel", () => ({ MaterialPanel: "MaterialPanel" }));
vi.mock("../lib/haptics", () => ({ playCue: vi.fn() }));
import { ScopedThemeProvider } from "../appearance";
import { IconButton } from "./icon-button";
it.each(["light", "dark"] as const)("pairs Sync and Add activity surfaces with contrasting icons in %s", async mode => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const c = getAppColors(mode);
  for (const primary of [true, false]) {
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(createElement(ScopedThemeProvider, { mode, children: createElement(IconButton, { icon: primary ? "sync" : "plus", label: primary ? "Sync activities" : "Add activity", onPress: vi.fn(), primary }) })); });
    const button = tree.root.findByType("Pressable" as never);
    const background = primary
      ? button.findByType("View" as never).props.style.backgroundColor
      : button.props.style({ pressed: false }).backgroundColor;
    expect(background).toBe(primary ? c.actionPrimary : c.card);
    expect(tree.root.findByType("AppIcon" as never).props.color).toBe(primary ? c.textOnAction : c.ink);
    await act(async () => tree.unmount());
  }
  vi.unstubAllGlobals();
});
it.each(["light", "dark"] as const)("uses Clear Glass backdrop in light mode when glass=true (%s)", async mode => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const c = getAppColors(mode);
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(createElement(ScopedThemeProvider, { mode, children: createElement(IconButton, { icon: "back", label: "Back", onPress: vi.fn(), glass: true }) })); });
  const button = tree.root.findByType("Pressable" as never);
  expect(button.props.style({ pressed: false }).backgroundColor).toBe(mode === "light" ? "transparent" : "rgba(20, 20, 19, 0.72)");
  expect(tree.root.findByType("AppIcon" as never).props.color).toBe(mode === "light" ? c.ink : c.white);
  expect(tree.root.findAllByType("MaterialPanel" as never)).toHaveLength(mode === "light" ? 1 : 0);
  await act(async () => tree.unmount());
  vi.unstubAllGlobals();
});
