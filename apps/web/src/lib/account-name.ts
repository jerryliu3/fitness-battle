const isPlaceholder = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return !normalized || normalized === "guest" || normalized === "anonymous athlete";
};

/** Repair placeholder names without replacing an athlete's saved profile name. */
export function accountName(saved: string, displayName: string, email: string): string {
  if (!isPlaceholder(saved)) return saved;
  return (!isPlaceholder(displayName) ? displayName.trim() : email.split("@")[0]?.trim()) || "Anonymous Athlete";
}
