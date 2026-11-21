import { appColorVariables, getAppColors, homeHealthColors, MEDAL_GOLD, type AppColors, type AppearancePreference } from "@fitness-battle/shared";
import type { CSSProperties } from "react";

/** SVG and inline styles inherit the same CSS variables as ordinary components. */
export const colors = Object.fromEntries(Object.entries(getAppColors()).map(([name, value]) => [
  name, `var(--app-${name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}, ${value})`,
])) as AppColors;
export const healthColors = homeHealthColors(colors);
export const APPEARANCE_COOKIE = "fb_appearance";
export function parseAppearance(value: string | null | undefined): AppearancePreference {
  return value === "light" || value === "dark" ? value : "system";
}
export function appearanceVariables(preference: AppearancePreference): CSSProperties {
  const light = appColorVariables("light"), dark = appColorVariables("dark");
  const brand = `var(--overtaek-brand-gold, var(--overtaek-brand-gold-srgb))`;
  for (const role of ["action-primary", "progress-fill", "tennis", "gold", "star-ember"]) {
    light[`--app-${role}`] = dark[`--app-${role}`] = brand;
  }
  for (const role of ["brand-mark", "chart-series", "field-teal"]) {
    dark[`--app-${role}`] = brand;
  }
  return {
    "--overtaek-brand-gold-srgb": MEDAL_GOLD.srgb,
    "--overtaek-brand-gold-p3": MEDAL_GOLD.displayP3,
    colorScheme: preference === "system" ? "light dark" : preference,
    ...Object.fromEntries(Object.entries(light).map(([key, value]) => [key,
      preference === "system" && key.startsWith("--app-") && value !== dark[key] ? `light-dark(${value}, ${dark[key]})` : preference === "dark" ? dark[key] : value,
    ])),
  } as CSSProperties;
}
