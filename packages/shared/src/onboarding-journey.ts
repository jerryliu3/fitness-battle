import { SPORT_IDS, type SportId, type UnitSystem } from "./compete/sports";
import { athleteCardModelForPeer } from "./athlete-card";
import { athleteLocationLine } from "./countries";
import { SPORTS } from "./compete/sports";

export const GUEST_INTRO_DRAFT_KEY = "overtaek-guest-intro-draft-v1";
export const GUEST_SIGNUP_PENDING_KEY = "overtaek-guest-signup-email-v1";
export const ONBOARDING_STEPS = ["sport", "overtake", "growth", "features", "athlete", "account"] as const;
export type OnboardingStep = typeof ONBOARDING_STEPS[number];
export const ONBOARDING_TITLES: Record<OnboardingStep, string> = {
  sport: "What moves you?",
  overtake: "Make training a game.",
  growth: "See your potential.",
  features: "More than a workout tracker.",
  athlete: "Create your athlete.",
  account: "Save your athlete.",
};

export type GuestIntroDraft = {
  sport: SportId;
  name: string;
  city: string;
  countryCode: string;
  introCompleted?: boolean;
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
      ...(draft.introCompleted === true ? { introCompleted: true } : {}),
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

export function hasCompletedOnboardingIntro(draft: GuestIntroDraft | null, pendingEmail: string | null, email?: string | null) {
  return Boolean(draft?.introCompleted && guestIntroForAccount(draft, pendingEmail, email));
}

export function onboardingAthleteCard(draft: GuestIntroDraft) {
  return {
    ...athleteCardModelForPeer({ name: draft.name.trim() || "Athlete", city: draft.city, sport: SPORTS.find(s => s.id === draft.sport)!.name }),
    countryCode: draft.countryCode || null,
    location: athleteLocationLine(draft.city, draft.countryCode || null),
  };
}

/** Hypothetical example values only: do not treat 500 as an account starting score. */
export const ONBOARDING_GROWTH = {
  scores: [500, 620, 780, 990, 1250, 1520, 1770, 2000],
  pointLabels: ["Start", "Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7"],
  labels: ["Start", "Week 3", "Week 7"] as [string, string, string],
};

export const ONBOARDING_FEATURES = [
  { id: "crews", label: "Crews", title: "Better together.",
    description: "Make progress on shared weekly goals or take on another crew." },
  { id: "leaderboards", label: "Leaderboards", title: "Find your place.",
    description: "Fresh weekly competitions, plus longer-term benchmarks and percentiles." },
  { id: "vitals", label: "Vitals Lab", title: "Understand your body.",
    description: "Explore sleep, recovery and health trends beyond workout totals." },
] as const;
export type OnboardingFeatureId = typeof ONBOARDING_FEATURES[number]["id"];

export const ONBOARDING_OVERTAKE_COPY = "Join events with athletes at your level. Overtake each other as you train and keep one another moving.";
