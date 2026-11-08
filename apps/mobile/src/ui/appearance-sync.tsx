import { useEffect } from "react";
import { Uniwind } from "uniwind";
import { APP_COLORS, type AppColors } from "@fitness-battle/shared";
import { useAppTheme } from "../appearance";
function controlVariables(c: AppColors) {
  return { "--background": c.paper, "--foreground": c.ink,
    "--surface": c.card, "--surface-foreground": c.ink,
    "--surface-secondary": c.soft, "--surface-secondary-foreground": c.ink,
    "--surface-tertiary": c.tennis, "--surface-tertiary-foreground": c.textOnAction,
    "--overlay": c.card, "--overlay-foreground": c.ink,
    "--muted": c.muted, "--default": c.soft, "--default-foreground": c.ink,
    "--accent": c.tennis, "--accent-foreground": c.textOnAction,
    "--field-background": c.card, "--field-foreground": c.ink,
    "--field-placeholder": c.muted, "--field-border": c.line,
    "--success": c.statusSuccess, "--warning": c.tennis, "--warning-foreground": c.textOnAction,
    "--danger": c.statusError, "--segment": c.card, "--segment-foreground": c.ink,
    "--border": c.line, "--separator": c.line, "--focus": c.focusRing, "--link": c.ink };
}
export function AppearanceSync() {
  const { preference } = useAppTheme();
  useEffect(() => {
    Uniwind.updateCSSVariables("light", controlVariables(APP_COLORS.light));
    Uniwind.updateCSSVariables("dark", controlVariables(APP_COLORS.dark));
    Uniwind.setTheme(preference);
  }, [preference]);
  return null;
}
