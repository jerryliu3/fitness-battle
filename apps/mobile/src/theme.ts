import { homeHealthColors, type AppColors, SHELL_COLORS as c, SHELL_SECTION } from "@fitness-battle/shared";

import { useThemeColors } from "./appearance";

/** Native section boundaries need a full pixel, rather than a faint device hairline. */
export const mobileSurfaces = {
  divider: SHELL_SECTION.dividerColor,
} as const;
export const colors = {
  ink: c.ink,
  paper: c.paper,
  card: c.card,
  muted: c.muted,
  line: c.line,
  lime: c.tennis,
  limeDeep: c.actionPressed,
  accent: c.ink,
  accentSoft: c.soft,
  greenSoft: c.soft,
  /** @deprecated use accent — kept for older style refs */
  blue: c.ink,
  blueSoft: c.soft,
};

export const fonts = {
  body: "Manrope_400Regular",
  bodyMedium: "Manrope_500Medium",
  bodyBold: "Manrope_700Bold",
};

export {
  SHELL_COLORS,
  SHELL_RADIUS,
  SHELL_TYPE,
  SHELL_TABS,
} from "@fitness-battle/shared";

export { AppThemeProvider, useAppTheme, useThemeColors, createThemedStyles, useThemedStyles } from "./appearance";

export { homeHealthColors } from "@fitness-battle/shared";
export function useHomeHealthColors() { return homeHealthColors(useThemeColors()); }
export function useMobileSurfaces() { return { divider: useThemeColors().divider }; }
export function legacyColors(c: AppColors) {
  return { ink: c.ink, paper: c.paper, card: c.card, muted: c.muted, line: c.line,
    lime: c.tennis, limeDeep: c.actionPressed, accent: c.ink, accentSoft: c.soft,
    greenSoft: c.soft, blue: c.ink, blueSoft: c.soft };
}
export function useLegacyColors() { return legacyColors(useThemeColors()); }
