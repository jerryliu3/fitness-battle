import medalGold from "./brand-gold.json";

export const MEDAL_GOLD = Object.freeze({
  srgb: medalGold.srgb,
  displayP3Channels: Object.freeze(medalGold.displayP3),
  displayP3: `color(display-p3 ${medalGold.displayP3.join(" ")})`,
  iosColorName: medalGold.iosColorName,
});

/** Platform-independent semantic color contract. Components never select palette names. */
export type ColorMode = "light" | "dark";
export type AppearancePreference = ColorMode | "system";

const goldOnLight = "#8a5b00";
const brandFill = { actionPrimary: MEDAL_GOLD.srgb, progressFill: MEDAL_GOLD.srgb };

const light = {
  ...brandFill,
  textPrimary: "#142b3b", textSecondary: "#637482", textMuted: "#637482", textOnAction: "#142b3b",
  actionPressed: "#e3a400", actionSoft: "#fff5d1",
  accentSecondary: "#626a74", accentSecondarySoft: "rgba(98, 106, 116, 0.09)",
  accentSecondaryBorder: "rgba(98, 106, 116, 0.22)",
  surfaceCanvas: "#f8f9f6", surfaceCard: "#ffffff", surfaceNavigation: "#ffffff", surfaceElevated: "#e9eff2",
  surfaceFeature: "#637580", textOnFeature: "#ffffff", textOnFeatureMuted: "#ffffff",
  surfaceInverse: "#142b3b", textOnInverse: "#ffffff",
  borderSubtle: "#e3e9e7", borderStrong: "#d0dad7", divider: "#d0dad7",
  brandMark: goldOnLight, chartSeries: goldOnLight, chartComparison: "#79838d",
  statusSuccess: "#24765c", statusSuccessSoft: "#e9f5ee", statusError: "#b93c3c",
  statusErrorSoft: "#fbeceb", textOnError: "#ffffff", overlay: "#142b3b80", shadow: "#000000",
  focusRing: "#626a74", white: "#ffffff",
};

type SemanticColors = { readonly [K in keyof typeof light]: string };
const dark: SemanticColors = {
  ...brandFill,
  textPrimary: "#f4f6f9", textSecondary: "#9ba3b4", textMuted: "#666e80", textOnAction: "#142b3b",
  actionPressed: "#e3a400", actionSoft: "#4a4128",
  accentSecondary: "#d7e3ec", accentSecondarySoft: "rgba(215, 227, 236, 0.12)",
  accentSecondaryBorder: "rgba(215, 227, 236, 0.28)",
  surfaceCanvas: "#0b0c10", surfaceCard: "#15171d", surfaceNavigation: "#20232c", surfaceElevated: "#20232c",
  surfaceFeature: "#20232c", textOnFeature: "#f4f6f9", textOnFeatureMuted: "#9ba3b4",
  surfaceInverse: "#142b3b", textOnInverse: "#ffffff",
  borderSubtle: "#272b36", borderStrong: "#363c4b", divider: "#363c4b",
  brandMark: MEDAL_GOLD.srgb, chartSeries: MEDAL_GOLD.srgb, chartComparison: "#acbfcc",
  statusSuccess: "#8ccdab", statusSuccessSoft: "#203d33", statusError: "#f09c98",
  statusErrorSoft: "#462d32", textOnError: "#142b3b", overlay: "#00000099", shadow: "#000000",
  focusRing: "#d7e3ec", white: "#ffffff",
};

function withCompatibility(c: SemanticColors) {
  return Object.freeze({ ...c,
    podiumGold: "#dfad3c", podiumSilver: "#9fa5af", podiumBronze: "#b87945",
    ink: c.textPrimary, muted: c.textSecondary, paper: c.surfaceCanvas, card: c.surfaceCard,
    line: c.borderSubtle, soft: c.surfaceElevated, secondary: c.chartComparison,
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
  const variables = Object.fromEntries(Object.entries(c).map(([name, value]) => [
    `--app-${name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`, value,
  ]));
  const aliases: Record<string, string> = {
    danger: "status-error", red: "status-error", ink: "text-primary", muted: "text-secondary", paper: "surface-canvas", card: "surface-card",
    line: "border-subtle", lime: "action-primary", "lime-deep": "action-pressed",
    accent: "accent-secondary", "accent-soft": "accent-secondary-soft", green: "status-success", "green-soft": "status-success-soft",
    gold: "gold", soft: "soft", "ot-secondary": "chart-comparison", "action-primary": "action-primary",
    "action-soft": "action-soft", "field-deep": "surface-feature", "field-teal": "chart-series", teal: "chart-series",
  };
  for (const [alias, role] of Object.entries(aliases)) variables[`--${alias}`] = `var(--app-${role})`;
  return variables;
}
