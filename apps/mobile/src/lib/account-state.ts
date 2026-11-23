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
const isPlaceholderName = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return !normalized || normalized === "guest" || normalized === "anonymous athlete";
};
export function nameForAccount(
  saved: string,
  displayName: string,
  email: string,
): string {
  if (!isPlaceholderName(saved)) return saved;
  return (
    (!isPlaceholderName(displayName) && displayName.trim()) ||
    email.split("@")[0] ||
    "Anonymous Athlete"
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
export function saveFailure(code?: string): string | null {
  if (code === "week_still_open") return null;
  if (code === "competition_inputs_changed") return "More activities arrived while saving. Please retry to save your latest changes.";
  return "Your changes are saved on this device but haven't reached your account. Please try again.";
}
