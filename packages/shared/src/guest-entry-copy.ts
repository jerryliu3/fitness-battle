/** Session / AsyncStorage keys for guest deep-link handoff (web + native). */
export const GUEST_ENTRY_STORAGE = {
  pendingInvite: "fb:pending-crew-invite:v1",
  pendingAccept: "fb:pending-crew-accept:v1",
  dismissPrefix: "fb:guest-entry-dismiss:v1:",
} as const;

/** Shared guest-entry sheet copy (web + native). */
export const GUEST_ENTRY_COPY = {
  sheetTitle: "Join in",
  sheetBody: "Create an account to compete and keep your progress.",
  keepBrowsing: "Keep browsing",
  createAccount: "Create account",
  signIn: "Sign in",
} as const;