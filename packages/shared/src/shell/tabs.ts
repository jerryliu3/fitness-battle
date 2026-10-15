export const PHONE_TABS = [
  { id: "today", label: "Today", href: "/" },
  { id: "arena", label: "Arena", href: "/board" },
  { id: "field", label: "Field", href: "/field" },
  { id: "you", label: "You", href: "/you" },
] as const;

export type PhoneTabId = (typeof PHONE_TABS)[number]["id"];

/** History routes stay reachable and sit with You, not as extra tabs. */
export function phoneTabFromPath(path: string): PhoneTabId {
  if (path.startsWith("/board")) return "arena";
  if (path.startsWith("/field")) return "field";
  if (
    path.startsWith("/you") ||
    path.startsWith("/progress") ||
    path.startsWith("/splits") ||
    path.startsWith("/pace") ||
    path.startsWith("/settings") ||
    path.startsWith("/connections")
  ) {
    return "you";
  }
  return "today";
}
