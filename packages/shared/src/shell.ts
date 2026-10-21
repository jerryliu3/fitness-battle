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
 * Open Field product palette (Everyday Club warm neutral + charcoal + gold).
 * Legacy plum/tennis keys remain for component compatibility.
 */
export const SHELL_COLORS = {
  plum: "#282f2c",
  plumDeep: "#1a1f1d",
  tennis: "#f1c75b",
  paper: "#fafaf7",
  card: "#ffffff",
  starEmber: "#f1c75b",
  ink: "#282f2c",
  muted: "#616c63",
  line: "#e0e5dc",
  green: "#2f6f4e",
  greenSoft: "#eef0e9",
  soft: "#eef0e9",
  secondary: "#819486",
  gold: "#f1c75b",
} as const;

export const SHELL_RADIUS = {
  control: 12,
  card: 16,
  sheet: 24,
  pill: 999,
} as const;

export const SHELL_TYPE = {
  display: "DM Sans",
  body: "DM Sans",
} as const;

export const SHELL_TOKENS = {
  colors: SHELL_COLORS,
  radius: SHELL_RADIUS,
  type: SHELL_TYPE,
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
