import { getAppColors as getSharedColors, MEDAL_GOLD, type ColorMode } from "@fitness-battle/shared";

export const APP_COLORS = {
  light: getSharedColors("light", MEDAL_GOLD.cssValue),
  dark: getSharedColors("dark", MEDAL_GOLD.cssValue),
};

export function getAppColors(mode: ColorMode = "light") { return APP_COLORS[mode]; }
