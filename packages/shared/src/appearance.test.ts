import { describe, expect, it } from "vitest";
import { SHELL_COLORS } from "./shell";
import { APP_COLORS, appColorVariables, getAppColors, resolveColorMode } from "./appearance";

describe("appearance foundation", () => {
  it("derives the compatibility palette from the canonical light appearance", () => {
    expect(SHELL_COLORS).toBe(APP_COLORS.light);
    for (const [key, value] of Object.entries(SHELL_COLORS)) {
      expect(getAppColors("light")[key as keyof typeof SHELL_COLORS]).toBe(value);
    }
  });
  it("uses primary charts and Slate accents with matching compatibility aliases in both modes", () => {
    for (const c of Object.values(APP_COLORS)) {
      expect(c.chartSeries).toBe(c.actionPrimary);
      expect(c.progressFill).toBe(c.actionPrimary);
      expect(c.fieldTeal).toBe(c.chartSeries);
      expect(c.fieldDeep).toBe(c.surfaceFeature);
      expect(c.accentSecondary).not.toBe(c.chartSeries);
    }
    expect(APP_COLORS.light.accentSecondary).toBe("#637580");
    expect(APP_COLORS.dark.accentSecondary).toBe("#b7c7d4");
  });
  it("resolves system and manual preferences with a stable fallback", () => {
    expect(resolveColorMode("system", "dark")).toBe("dark");
    expect(resolveColorMode("system", null)).toBe("light");
    expect(resolveColorMode("light", "dark")).toBe("light");
    expect(resolveColorMode("dark", "light")).toBe("dark");
  });
  it("keeps action foregrounds invariant and publishes matching namespaced variables", () => {
    expect(APP_COLORS.dark.textOnAction).toBe(APP_COLORS.light.textOnAction);
    expect(APP_COLORS.dark.actionPrimary).toBe(APP_COLORS.light.actionPrimary);
    expect(APP_COLORS.dark.textPrimary).not.toBe(APP_COLORS.light.textPrimary);
    expect(Object.keys(appColorVariables("dark"))).toEqual(Object.keys(appColorVariables("light")));
    expect(appColorVariables("dark")["--ink"]).toBe("var(--app-text-primary)");
    expect(appColorVariables("dark")["--app-surface-card"]).toBe(APP_COLORS.dark.surfaceCard);
  });
});
