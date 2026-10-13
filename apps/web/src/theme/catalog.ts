/**
 * Visual theme catalog. Navigation and data stay shared; each entry is a skin
 * (tokens, type, wordmark). Add an id, a CSS block, and a catalog row to ship
 * another theme.
 */
export const THEME_IDS = ["rally", "form", "ink"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME_ID: ThemeId = "rally";
export const THEME_COOKIE_NAME = "fb_theme";
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export interface AppTheme {
  id: ThemeId;
  label: string;
  mood: string;
  description: string;
  htmlClass: string;
  wordmark: string;
  mark: string;
  themeColor: string;
  backgroundColor: string;
}

export const THEMES: Record<ThemeId, AppTheme> = {
  rally: {
    id: "rally",
    label: "Rally",
    mood: "Playful sport",
    description:
      "Plum and tennis yellow, Ace in your corner, mileage matchups and small-move rings. Default product theme.",
    htmlClass: "theme-rally",
    wordmark: "RALLY",
    mark: "/",
    themeColor: "#40234e",
    backgroundColor: "#40234e",
  },
  form: {
    id: "form",
    label: "Form",
    mood: "Serious",
    description:
      "Signal orange, graphite, and a squared record of effort.",
    htmlClass: "theme-form",
    wordmark: "FORM",
    mark: "/",
    themeColor: "#ef6635",
    backgroundColor: "#e7e8eb",
  },
  ink: {
    id: "ink",
    label: "Ink",
    mood: "Athletic",
    description: "The earlier ink and lime Split chrome.",
    htmlClass: "theme-ink",
    wordmark: "SPLIT",
    mark: "//",
    themeColor: "#12141a",
    backgroundColor: "#eef1f4",
  },
};

export const THEME_OPTIONS = THEME_IDS.map((id) => THEMES[id]);

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return value === "rally" || value === "form" || value === "ink";
}

export function parseThemeId(value: string | null | undefined): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME_ID;
}

export function getTheme(id: ThemeId = DEFAULT_THEME_ID): AppTheme {
  return THEMES[id];
}
