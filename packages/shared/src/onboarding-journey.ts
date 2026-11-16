import { SPORT_IDS, type SportId } from "./compete/sports";
import { rankForElo } from "./compete/ranks";

export const GUEST_INTRO_DRAFT_KEY = "overtaek-guest-intro-draft-v1";
export const GUEST_SIGNUP_PENDING_KEY = "overtaek-guest-signup-email-v1";
export const ONBOARDING_STEPS = ["sport", "overtake", "growth", "athlete", "account"] as const;
export type OnboardingStep = typeof ONBOARDING_STEPS[number];
export const ONBOARDING_TITLES: Record<OnboardingStep, string> = {
  sport: "What moves you?",
  overtake: "Make your first overtake.",
  growth: "See your potential.",
  athlete: "Create your athlete.",
  account: "Save your athlete.",
};

export type GuestIntroDraft = {
  sport: SportId;
  name: string;
  city: string;
  countryCode: string;
};
export const EMPTY_GUEST_INTRO: GuestIntroDraft = { sport: "running", name: "", city: "", countryCode: "" };

/** Device-local profile preparation. Never carries competition facts or permissions. */
export function parseGuestIntroDraft(raw: string | null): GuestIntroDraft | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const draft = value as Partial<GuestIntroDraft>;
    if (!SPORT_IDS.includes(draft.sport as SportId)) return null;
    return {
      sport: draft.sport as SportId,
      name: typeof draft.name === "string" ? draft.name.slice(0, 80) : "",
      city: typeof draft.city === "string" ? draft.city.slice(0, 80) : "",
      countryCode: typeof draft.countryCode === "string" && /^[A-Z]{2}$/.test(draft.countryCode) ? draft.countryCode : "",
    };
  } catch { return null; }
}

export function guestIntroForAccount(draft: GuestIntroDraft | null, pendingEmail: string | null, email?: string | null) {
  return draft && email && pendingEmail?.trim().toLowerCase() === email.trim().toLowerCase() ? draft : null;
}

/** A possible trajectory for the outlook screen; never applied to account state. */
export const ONBOARDING_GROWTH = {
  scores: [1000, 1020, 1050, 1080, 1110, 1160, 1210],
  pointLabels: ["Start", "Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"],
  labels: ["Start", "Week 3", "Week 6"] as [string, string, string],
  from: rankForElo(1000),
  to: rankForElo(1210),
};
