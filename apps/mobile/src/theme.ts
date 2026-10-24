import { SHELL_COLORS as c, SHELL_SECTION } from "@fitness-battle/shared";

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
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodyBold: "DMSans_700Bold",
};

export {
  SHELL_COLORS,
  SHELL_RADIUS,
  SHELL_TYPE,
  SHELL_TABS,
} from "@fitness-battle/shared";
