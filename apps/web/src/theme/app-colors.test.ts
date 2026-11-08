import { expect, it } from "vitest";
import { APP_COLORS } from "@fitness-battle/shared";
import { appearanceVariables, colors, parseAppearance } from "./app-colors";
it("gives server-rendered system appearance native CSS light/dark pairs before hydration", () => {
  const variables = appearanceVariables("system") as Record<string, string>;
  expect(variables.colorScheme).toBe("light dark");
  expect(variables["--app-surface-canvas"]).toBe(`light-dark(${APP_COLORS.light.surfaceCanvas}, ${APP_COLORS.dark.surfaceCanvas})`);
  expect(appearanceVariables("dark")["--app-accent-secondary" as keyof ReturnType<typeof appearanceVariables>]).toBe(APP_COLORS.dark.accentSecondary);
  expect(colors.chartSeries).toContain("var(--app-chart-series,");
  expect(parseAppearance("unknown")).toBe("system");
});
