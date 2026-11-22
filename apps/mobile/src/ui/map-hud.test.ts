import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { getAppColors } from "@fitness-battle/shared";

vi.mock("react-native", () => ({
  View: "View",
  StyleSheet: { absoluteFill: {}, create: (value: unknown) => value },
}));
vi.mock("./material-panel", () => ({ MaterialPanel: "MaterialPanel" }));

import { ScopedThemeProvider } from "../appearance";
import { MapHudBackdrop, useMapHud } from "./map-hud";

function Probe() {
  return createElement("hud", { value: useMapHud() });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it.each(["light", "dark"] as const)("resolves Clear Glass tokens only in light mode (%s)", async (mode) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const c = getAppColors(mode);
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      createElement(ScopedThemeProvider, {
        mode,
        children: createElement("root", null, createElement(Probe), createElement(MapHudBackdrop, { radius: 14 })),
      }),
    );
  });

  const hud = renderer.root.findByType("hud" as never).props.value as ReturnType<typeof useMapHud>;
  if (mode === "light") {
    expect(hud.light).toBe(true);
    expect(hud.surface).toEqual({
      backgroundColor: c.mapHudSurface,
      borderColor: c.mapHudBorder,
      borderWidth: 1,
    });
    expect(hud.chrome).toEqual({
      backgroundColor: "transparent",
      borderColor: c.mapHudBorder,
      borderWidth: 1,
    });
    expect(hud.ink).toBe(c.ink);
    expect(hud.muted).toBe(c.mapHudMuted);
    expect(hud.accent).toBe(c.ink);
    expect(renderer.root.findByType("MaterialPanel" as never).props.fallbackColor).toBe(c.card);
  } else {
    expect(hud.light).toBe(false);
    expect(hud.surface).toBeUndefined();
    expect(hud.chrome).toBeUndefined();
    expect(hud.ink).toBe(c.white);
    expect(hud.muted).toBe(c.mapHudMuted);
    expect(hud.accent).toBe(c.tennis);
    expect(renderer.root.findAllByType("MaterialPanel" as never)).toHaveLength(0);
  }

  await act(async () => renderer.unmount());
});
