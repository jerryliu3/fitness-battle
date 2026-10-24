/**
 * Phone-first shell shared by Expo and the web column.
 * Plain data only — no React, DOM, or native imports.
 */

export const SHELL_TAB_IDS = ["today", "arena", "you", "field"] as const;

export type ShellTabId = (typeof SHELL_TAB_IDS)[number];

export interface ShellTab {
  id: ShellTabId;
  label: string;
  /** Same path on the web column and the Expo tab navigator. */
  href: `/${ShellTabId}`;
}

export const SHELL_TABS: readonly ShellTab[] = [
  { id: "today", label: "Home", href: "/today" },
  { id: "arena", label: "Compete", href: "/arena" },
  { id: "you", label: "Progress", href: "/you" },
  { id: "field", label: "Crew", href: "/field" },
];

export function isShellTabId(
  value: string | null | undefined,
): value is ShellTabId {
  return (
    value === "today" ||
    value === "arena" ||
    value === "field" ||
    value === "you"
  );
}

export function shellTabById(id: string | null | undefined): ShellTab | null {
  if (!isShellTabId(id)) return null;
  return SHELL_TABS.find((tab) => tab.id === id) ?? null;
}

/** Match a pathname to a tab. Query strings and trailing slashes are ignored. */
export function shellTabFromPath(
  path: string | null | undefined,
): ShellTab | null {
  if (!path) return null;
  const clean = path.split("?")[0]?.replace(/\/+$/, "") || "/";
  return (
    SHELL_TABS.find(
      (tab) => clean === tab.href || clean.startsWith(`${tab.href}/`),
    ) ?? null
  );
}

/**
 * Everyday Club palette: warm canvas, navy typography, solar yellow and alpine teal.
 * Legacy plum/tennis keys remain for component compatibility.
 */
export const SHELL_COLORS = {
  plum: "#142b3b",
  plumDeep: "#0c1d29",
  tennis: "#f7c948",
  paper: "#f8f9f6",
  card: "#ffffff",
  starEmber: "#f7c948",
  ink: "#142b3b",
  muted: "#637482",
  line: "#e3e9e7",
  green: "#24765c",
  greenSoft: "#eef3f1",
  soft: "#eef3f1",
  secondary: "#668e91",
  gold: "#f7c948",
  actionPrimary: "#f7c948",
  actionPressed: "#dfb237",
  actionSoft: "#fff5d1",
  textPrimary: "#142b3b",
  surfaceCanvas: "#f8f9f6",
  surfaceCard: "#ffffff",
  fieldDeep: "#103e46",
  fieldTeal: "#176c75",
  statusSuccess: "#24765c",
  statusSuccessSoft: "#e9f5ee",
  statusError: "#b93c3c",
} as const;

export const SHELL_RADIUS = {
  control: 12,
  card: 20,
  sheet: 24,
  pill: 999,
} as const;

export const SHELL_TYPE = {
  display: "DM Sans",
  body: "DM Sans",
} as const;

/** Logical pixels; web adapters convert sizes to rem, native keeps font scaling. */
export const SHELL_TYPOGRAPHY = {
  pageTitle: { size: 30, lineHeight: 36, weight: 700 },
  navigationTitle: { size: 20, lineHeight: 26, weight: 700 },
  sectionTitle: { size: 22, lineHeight: 28, weight: 700 },
  contentTitle: { size: 18, lineHeight: 24, weight: 700 },
  body: { size: 16, lineHeight: 24, weight: 400 },
  itemTitle: { size: 14, lineHeight: 20, weight: 500 },
  supporting: { size: 14, lineHeight: 20, weight: 400 },
  actionLabel: { size: 14, lineHeight: 20, weight: 700 },
  caption: { size: 12, lineHeight: 18, weight: 400 },
  badgeLabel: { size: 12, lineHeight: 16, weight: 700 },
} as const;
export type TypographyRole = keyof typeof SHELL_TYPOGRAPHY;
export const SHELL_SECTION = { subtitleGap: 4, contentGap: 12, beforeDivider: 16, afterDivider: 12, dividerWidth: 1, dividerColor: "#d0dad7" } as const;

export const SHELL_SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, page: 20, section: 28 } as const;
export const SHELL_MOTION = { feedback: 120, transition: 220, reveal: 420 } as const;

export const SHELL_TOKENS = {
  spacing: SHELL_SPACING,
  motion: SHELL_MOTION,
  colors: SHELL_COLORS,
  radius: SHELL_RADIUS,
  type: SHELL_TYPE,
  typography: SHELL_TYPOGRAPHY,
  section: SHELL_SECTION,
} as const;

export const PERSON_ICON_PATH =
  "M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0";

export const SHELL_TAB_ICONS: Record<ShellTabId, string> = {
  today: "M3 10 12 3l9 7v10H15v-7H9v7H3Z",
  arena: "M4 21V4m0 2c5-5 11 5 16 0v9c-5 5-11-5-16 0",
  field:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M16 3a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  you: "M3 20h18M3 16l6-6 4 4 8-8M17 6h4v4",
};
