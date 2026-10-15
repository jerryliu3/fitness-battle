/**
 * Phone-first shell shared by Expo and the web column.
 * Plain data only — no React, DOM, or native imports.
 */

export const SHELL_TAB_IDS = ["today", "arena", "field", "you"] as const;

export type ShellTabId = (typeof SHELL_TAB_IDS)[number];

export interface ShellTab {
  id: ShellTabId;
  label: string;
  /** Same path on the web column and the Expo tab navigator. */
  href: `/${ShellTabId}`;
}

export const SHELL_TABS: readonly ShellTab[] = [
  { id: "today", label: "Today", href: "/today" },
  { id: "arena", label: "Arena", href: "/arena" },
  { id: "field", label: "Field", href: "/field" },
  { id: "you", label: "You", href: "/you" },
];

export function isShellTabId(value: string | null | undefined): value is ShellTabId {
  return value === "today" || value === "arena" || value === "field" || value === "you";
}

export function shellTabById(id: string | null | undefined): ShellTab | null {
  if (!isShellTabId(id)) return null;
  return SHELL_TABS.find((tab) => tab.id === id) ?? null;
}

/** Match a pathname to a tab. Query strings and trailing slashes are ignored. */
export function shellTabFromPath(path: string | null | undefined): ShellTab | null {
  if (!path) return null;
  const clean = path.split("?")[0]?.replace(/\/+$/, "") || "/";
  return (
    SHELL_TABS.find((tab) => clean === tab.href || clean.startsWith(`${tab.href}/`)) ??
    null
  );
}

/**
 * Fitness Battle phone palette.
 * Plum, tennis yellow, paper, and Star Ember — the Rally product colors.
 */
export const SHELL_COLORS = {
  plum: "#40234e",
  plumDeep: "#2a1634",
  tennis: "#f6f253",
  paper: "#fff9e9",
  card: "#fffdf7",
  starEmber: "#f5c451",
  ink: "#40234e",
  muted: "#726377",
  line: "#e4d7c4",
  green: "#2f6f4e",
  greenSoft: "#e7f3ec",
} as const;

export const SHELL_RADIUS = {
  control: 14,
  card: 22,
  sheet: 28,
  pill: 999,
} as const;

export const SHELL_TYPE = {
  display: "Archivo Black",
  body: "DM Sans",
} as const;

export const SHELL_TOKENS = {
  colors: SHELL_COLORS,
  radius: SHELL_RADIUS,
  type: SHELL_TYPE,
} as const;
