import { expect, it } from "vitest";
import { APP_COLORS, MEDAL_GOLD } from "@fitness-battle/shared";
import { appearanceVariables, colors, parseAppearance } from "./app-colors";
it("gives server-rendered system appearance native CSS light/dark pairs before hydration", () => {
  const variables = appearanceVariables("system") as Record<string, string>;
  expect(variables.colorScheme).toBe("light dark");
  expect(variables["--app-surface-canvas"]).toBe(`light-dark(${APP_COLORS.light.surfaceCanvas}, ${APP_COLORS.dark.surfaceCanvas})`);
  expect(appearanceVariables("dark")["--app-accent-secondary" as keyof ReturnType<typeof appearanceVariables>]).toBe(APP_COLORS.dark.accentSecondary);
  expect(variables["--overtaek-brand-gold-p3"]).toBe(MEDAL_GOLD.displayP3);
  expect(variables["--overtaek-brand-gold-srgb"]).toBe("#FFB800");
  expect(variables["--app-action-primary"]).toBe("var(--overtaek-brand-gold, var(--overtaek-brand-gold-srgb))");
  expect(variables["--app-chart-series"]).toBe(variables["--app-action-primary"]);
  expect(colors.chartSeries).toContain("var(--app-chart-series,");
  expect(variables["--map-hud-clear-surface"]).toBe(APP_COLORS.light.mapHudSurface);
  expect(variables["--map-hud-clear-border"]).toBe(APP_COLORS.light.mapHudBorder);
  expect(variables["--map-hud-clear-muted"]).toBe(APP_COLORS.light.mapHudMuted);
  expect(variables["--map-hud-clear-ink"]).toBe(APP_COLORS.light.textPrimary);
  expect(parseAppearance("unknown")).toBe("system");
});
