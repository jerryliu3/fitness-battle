/** Platform-independent semantic color contract. Components never select palette names. */
export type ColorMode = "light" | "dark";
export type AppearancePreference = ColorMode | "system";

const light = {
  textPrimary: "#142b3b", textSecondary: "#536570", textOnAction: "#142b3b",
  actionPrimary: "#f7c948", actionPressed: "#dfb237", actionSoft: "#fff5d1",
  accentSecondary: "#637580", accentSecondarySoft: "#e9eff2",
  surfaceCanvas: "#f8f9f6", surfaceCard: "#ffffff", surfaceNavigation: "#ffffff",
  surfaceFeature: "#637580", textOnFeature: "#ffffff", textOnFeatureMuted: "#ffffff",
  surfaceInverse: "#142b3b", textOnInverse: "#ffffff",
  borderSubtle: "#e3e9e7", divider: "#d0dad7",
  chartSeries: "#637580", chartComparison: "#96a6b1", progressFill: "#f7c948",
  statusSuccess: "#24765c", statusSuccessSoft: "#e9f5ee", statusError: "#b93c3c",
  statusErrorSoft: "#fbeceb", overlay: "#142b3b80", shadow: "#000000",
  focusRing: "#637580", white: "#ffffff",
};

type SemanticColors = { readonly [K in keyof typeof light]: string };
const dark: SemanticColors = {
  textPrimary: "#f7faf8", textSecondary: "#bbccd0", textOnAction: "#142b3b",
  actionPrimary: "#f7c948", actionPressed: "#dfb237", actionSoft: "#4a4128",
  accentSecondary: "#b7c7d4", accentSecondarySoft: "#33424a",
  surfaceCanvas: "#111f29", surfaceCard: "#1c2e38", surfaceNavigation: "#111f29",
  surfaceFeature: "#33424e", textOnFeature: "#ffffff", textOnFeatureMuted: "#d7e9ea",
  surfaceInverse: "#142b3b", textOnInverse: "#ffffff",
  borderSubtle: "#324954", divider: "#3c515c",
  chartSeries: "#b7c7d4", chartComparison: "#78909e", progressFill: "#f7c948",
  statusSuccess: "#8ccdab", statusSuccessSoft: "#203d33", statusError: "#f09c98",
  statusErrorSoft: "#462d32", overlay: "#00000099", shadow: "#000000",
  focusRing: "#b7c7d4", white: "#ffffff",
};

function withCompatibility(c: SemanticColors) {
  return Object.freeze({ ...c,
    ink: c.textPrimary, muted: c.textSecondary, paper: c.surfaceCanvas, card: c.surfaceCard,
    line: c.borderSubtle, soft: c.accentSecondarySoft, secondary: c.chartComparison,
    tennis: c.actionPrimary, gold: c.actionPrimary, starEmber: c.actionPrimary,
    plum: c.textPrimary, plumDeep: c.surfaceInverse,
    green: c.statusSuccess, greenSoft: c.statusSuccessSoft,
    /** Compatibility names for chart/feature chrome; geographic scenery has its own palette. */
    fieldTeal: c.chartSeries, fieldDeep: c.surfaceFeature,
  });
}
export const APP_COLORS = Object.freeze({ light: withCompatibility(light), dark: withCompatibility(dark) });
export type AppColors = typeof APP_COLORS.light;
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
  const semantic = Object.fromEntries(Object.entries(c).map(([name, value]) => [
    `--app-${name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`, value,
  ]));
  return { ...semantic, "--ink": c.ink, "--muted": c.muted, "--paper": c.paper,
    "--card": c.card, "--line": c.line, "--lime": c.actionPrimary, "--lime-deep": c.actionPressed,
    "--accent": c.accentSecondary, "--accent-soft": c.accentSecondarySoft,
    "--soft": c.soft, "--green": c.green, "--green-soft": c.greenSoft, "--gold": c.gold,
    "--ot-secondary": c.chartComparison, "--action-primary": c.actionPrimary, "--action-soft": c.actionSoft,
    "--field-deep": c.surfaceFeature, "--field-teal": c.chartSeries, "--teal": c.chartSeries };
}
