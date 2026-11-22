import { getAppColors as getSharedColors, type ColorMode } from "@fitness-battle/shared";
import { nativeMedalGold } from "./ui/medal-gold.web";

export const APP_COLORS = {
  light: getSharedColors("light", nativeMedalGold),
  dark: getSharedColors("dark", nativeMedalGold),
};

export function getAppColors(mode: ColorMode = "light") { return APP_COLORS[mode]; }
