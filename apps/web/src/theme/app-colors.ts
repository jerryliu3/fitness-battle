import { appColorVariables, getAppColors, homeHealthColors, type AppColors, type AppearancePreference } from "@fitness-battle/shared";
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
  return { colorScheme: preference === "system" ? "light dark" : preference,
    ...Object.fromEntries(Object.entries(light).map(([key, value]) => [key,
      preference === "system" ? `light-dark(${value}, ${dark[key]})` : preference === "dark" ? dark[key] : value,
    ])),
  } as CSSProperties;
}
