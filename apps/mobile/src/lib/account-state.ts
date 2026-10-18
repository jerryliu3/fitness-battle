import {
  withAccountEloBaseline,
  type CompeteState,
} from "@fitness-battle/shared";

export function accountStorageKeys(id: string | null) {
  const scope = id ?? "guest";
  return {
    state: `fb-compete-v2:${scope}`,
    dirty: `fb-compete-dirty-v2:${scope}`,
    seen: `fb-counted-seen-v2:${scope}`,
  };
}
export function nameForAccount(
  saved: string,
  displayName: string,
  email: string,
): string {
  if (saved.trim() && saved.trim().toLowerCase() !== "guest") return saved;
  return (
    (displayName.trim().toLowerCase() !== "guest" && displayName.trim()) ||
    email.split("@")[0] ||
    "Athlete"
  );
}
export function hydrateAccountIdentity(
  state: CompeteState,
  user: { displayName: string; email: string } | null,
  live: boolean,
) {
  const next = live ? withAccountEloBaseline(state) : state;
  return user
    ? { ...next, name: nameForAccount(next.name, user.displayName, user.email) }
    : next;
}
export function saveFailure(code?: string): string {
  return code === "week_still_open"
    ? "This week is still open. Your registration stays active until the week ends. Refresh and try again."
    : "Your changes are saved on this device but haven't reached your account. Please try again.";
}
