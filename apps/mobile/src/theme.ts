/** Default product skin: Rally (plum / tennis). Matches web `data-theme="rally"`. */
export const colors = {
  ink: "#40234e",
  paper: "#40234e",
  surface: "#fff9e9",
  card: "#fffdf7",
  muted: "#726377",
  mutedOnPlum: "rgba(255,249,233,0.82)",
  line: "rgba(64,35,78,0.15)",
  lineOnPlum: "rgba(255,249,233,0.35)",
  lime: "#f6f253",
  limeDeep: "#f6f253",
  tennis: "#f6f253",
  plum: "#40234e",
  accent: "#40234e",
  accentSoft: "#fff9e9",
  greenSoft: "#e7f3ec",
  green: "#2f6f4e",
  radius: 0,
  /** @deprecated aliases kept for older style refs */
  blue: "#40234e",
  blueSoft: "#fff9e9",
};

export const fonts = {
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodyBold: "DMSans_700Bold",
  display: "ArchivoBlack_400Regular",
  comic: "Bangers_400Regular",
};

export const brand = {
  wordmark: "RALLY",
  tagline: "EVERYDAY PLAY.",
  tabs: {
    track: "My week",
    field: "Matchups",
    splits: "Moves",
    you: "You",
  } as const,
};
