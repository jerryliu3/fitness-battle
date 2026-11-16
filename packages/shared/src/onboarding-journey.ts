import { SPORT_IDS, type SportId, type UnitSystem } from "./compete/sports";
import { RANK_BANDS } from "./compete/ranks";

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

export type OnboardingWeeklyVolumes = Partial<Record<SportId, string>>;

export function parseOnboardingWeeklyVolumes(value: unknown): OnboardingWeeklyVolumes {
  if (!value || typeof value !== "object") return {};
  const saved = value as Record<string, unknown>;
  return Object.fromEntries(SPORT_IDS.flatMap(sport => typeof saved[sport] === "string" ? [[sport, saved[sport]]] : []));
}

export function onboardingWeeklyVolumeUnit(sport: SportId, units: UnitSystem) {
  return sport === "walking" ? "steps" : sport === "strength" ? "minutes" : units === "metric" ? "km" : "miles";
}

/** Convert optional declarations to the scorer's metres, seconds or steps. */
export function onboardingDeclaredVolume(sport: SportId, value: string | undefined, units: UnitSystem): number | undefined {
  if (!value?.trim()) return undefined;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return undefined;
  const native = amount * (sport === "running" || sport === "cycling" ? (units === "metric" ? 1000 : 1609.344) : sport === "strength" ? 60 : 1);
  return Number.isFinite(native) ? native : undefined;
}

/** A possible trajectory for the outlook screen; never applied to account state. */
const from = RANK_BANDS.find(rank => rank.id === "active")!;
const to = RANK_BANDS.find(rank => rank.id === "challenger")!;
export const ONBOARDING_GROWTH = {
  scores: [0, .1, .24, .4, .6, .8, 1].map(progress => Math.round(from.min + (to.min - from.min) * progress)),
  pointLabels: ["Start", "Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"],
  labels: ["Start", "Week 3", "Week 6"] as [string, string, string],
  from,
  to,
};
