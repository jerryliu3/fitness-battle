import { describe, expect, it } from "vitest";
import { SHELL_COLORS } from "./shell";
import { APP_COLORS, appColorVariables, getAppColors, resolveColorMode } from "./appearance";

describe("appearance foundation", () => {
  it("preserves every existing light-mode token from main", () => {
    for (const [key, value] of Object.entries(SHELL_COLORS)) {
      expect(getAppColors("light")[key as keyof typeof SHELL_COLORS]).toBe(value);
    }
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
    expect(Object.keys(appColorVariables("dark")).every(key => key.startsWith("--app-"))).toBe(true);
    expect(appColorVariables("dark")["--app-surface-card"]).toBe(APP_COLORS.dark.surfaceCard);
  });
});
