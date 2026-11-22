import { APP_COLORS as sharedColors, type AppColors, type ColorMode } from "@fitness-battle/shared";
import { nativeMedalGold as gold } from "./ui/medal-gold.web";

function webColors(mode: ColorMode): AppColors {
  const colors = sharedColors[mode];
  return {
    ...colors,
    actionPrimary: gold, progressFill: gold, tennis: gold, gold, starEmber: gold,
    chartSeries: gold, fieldTeal: gold,
  };
}

export const APP_COLORS = { light: webColors("light"), dark: webColors("dark") };
export function getAppColors(mode: ColorMode = "light"): AppColors { return APP_COLORS[mode]; }
