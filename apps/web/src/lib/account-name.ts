/** Repair the guest placeholder without replacing an athlete's saved profile name. */
export function accountName(saved: string, displayName: string, email: string): string {
  const name = saved.trim();
  if (name && name.toLowerCase() !== "guest") return saved;
  const account = displayName.trim();
  return (account && account.toLowerCase() !== "guest" ? account : email.split("@")[0]?.trim()) || "Athlete";
}
