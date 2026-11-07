import { SHELL_COLORS } from "./shell";
/** Platform-independent semantic color contract. Components never select palette names. */
export type ColorMode = "light" | "dark";
export type AppearancePreference = ColorMode | "system";

const light = {
  ...SHELL_COLORS,
  textSecondary: SHELL_COLORS.muted, textOnAction: SHELL_COLORS.ink,
  accentSecondary: SHELL_COLORS.fieldTeal, accentSecondarySoft: SHELL_COLORS.soft,
  surfaceNavigation: SHELL_COLORS.card, surfaceFeature: SHELL_COLORS.fieldDeep,
  textOnFeature: "#ffffff", textOnFeatureMuted: "#d7e9ea",
  surfaceInverse: SHELL_COLORS.plumDeep, textOnInverse: "#ffffff",
  borderSubtle: SHELL_COLORS.line, divider: "#d0dad7",
  chartSeries: SHELL_COLORS.fieldTeal, chartComparison: SHELL_COLORS.secondary,
  progressFill: SHELL_COLORS.actionPrimary, statusErrorSoft: "#fbeceb",
  overlay: "#142b3b80", shadow: "#000000", focusRing: SHELL_COLORS.fieldTeal, white: "#ffffff",
};

type SemanticColors = { readonly [K in keyof typeof light]: string };
const dark: SemanticColors = {
  ...light,
  textPrimary: "#f7faf8", textSecondary: "#b7c7d4", textOnAction: "#142b3b",
  actionPrimary: "#f7c948", actionPressed: "#dfb237", actionSoft: "#4a4128",
  accentSecondary: "#8fc7cc", accentSecondarySoft: "#263e46",
  surfaceCanvas: "#111f29", surfaceCard: "#1c2e38", surfaceNavigation: "#111f29",
  surfaceFeature: "#33424e", textOnFeature: "#ffffff", textOnFeatureMuted: "#d7e9ea",
  surfaceInverse: "#142b3b", textOnInverse: "#ffffff",
  borderSubtle: "#324954", divider: "#3c515c",
  chartSeries: "#8fc7cc", chartComparison: "#789b9e", progressFill: "#f7c948",
  statusSuccess: "#8ccdab", statusSuccessSoft: "#203d33", statusError: "#f09c98",
  statusErrorSoft: "#462d32", overlay: "#00000099", shadow: "#000000",
  focusRing: "#8fc7cc", white: "#ffffff",
};

export const APP_COLORS = Object.freeze({ light: Object.freeze(light), dark: Object.freeze({ ...dark, plum: dark.textPrimary, plumDeep: dark.surfaceInverse, green: dark.statusSuccess, greenSoft: dark.statusSuccessSoft, fieldDeep: dark.surfaceFeature, ink: dark.textPrimary, muted: dark.textSecondary, paper: dark.surfaceCanvas, card: dark.surfaceCard, line: dark.borderSubtle, soft: dark.accentSecondarySoft, fieldTeal: dark.chartSeries, secondary: dark.chartComparison }) });
export type AppColors = SemanticColors;
export function resolveColorMode(preference: AppearancePreference, system: ColorMode | null | undefined): ColorMode {
  return preference === "system" ? system ?? "light" : preference;
}
export function getAppColors(mode: ColorMode = "light"): AppColors { return APP_COLORS[mode]; }
export function homeHealthColors(c: AppColors) {
  return { background: c.paper, tile: c.card, border: c.line, text: c.ink,
    secondary: c.muted, accent: c.chartSeries, comparison: c.chartComparison };
}

/** Web publishes this mapping from shared tokens; no parallel CSS palette to maintain. */
export function appColorVariables(mode: ColorMode): Record<string, string> {
  const c = getAppColors(mode);
  return Object.fromEntries(Object.entries(c).map(([name, value]) => [
    `--app-${name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`, value,
  ]));
}
