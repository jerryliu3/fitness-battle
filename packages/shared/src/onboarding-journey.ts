import { VITALS_LAB_METRICS, type VitalsLabMetricDisplay } from "./vitals-lab-body";
import type { CrewWeekRelayInput } from "./compete/crew-relay";
import { SPORT_IDS, type SportId, type UnitSystem } from "./compete/sports";
import { athleteCardModelForPeer } from "./athlete-card";
import { athleteLocationLine } from "./countries";
import { SPORTS } from "./compete/sports";

export const GUEST_INTRO_DRAFT_KEY = "overtaek-guest-intro-draft-v1";
export const GUEST_SIGNUP_PENDING_KEY = "overtaek-guest-signup-email-v1";
export const ONBOARDING_STEPS = ["sport", "athlete", "overtake", "growth", "account"] as const;
export type OnboardingStep = typeof ONBOARDING_STEPS[number];
export const ONBOARDING_TITLES: Record<OnboardingStep, string> = {
  sport: "What moves you?",
  overtake: "Make training fun.",
  growth: "Your story is just starting.",
  athlete: "Meet your athlete.",
  account: "Make it official.",
};

export type GuestIntroDraft = {
  sport: SportId;
  name: string;
  city: string;
  countryCode: string;
  introCompleted?: boolean;
  photo?: string;
};
export const EMPTY_GUEST_INTRO: GuestIntroDraft = { sport: "running", name: "", city: "", countryCode: "" };

export function isGuestPhoto(value: unknown): value is string {
  return typeof value === "string" && value.length <= 1_500_000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}

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
      ...(isGuestPhoto(draft.photo) ? { photo: draft.photo } : {}),
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
    ...athleteCardModelForPeer({ name: draft.name.trim() || "Athlete", city: draft.city, avatarUrl: draft.photo, sport: SPORTS.find(s => s.id === draft.sport)!.name }),
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
  { id: "growth", label: "Growth", title: "See your potential.",
    description: "Build your Effort Score through consistent training." },
  { id: "crews", label: "Crew", title: "Better together.",
    description: "Make progress on shared weekly goals or take on another crew." },
  { id: "vitals", label: "Health Lab", title: "Understand your body.",
    description: "Explore sleep, recovery and health trends beyond workout totals." },
] as const;
export type OnboardingFeatureId = typeof ONBOARDING_FEATURES[number]["id"];

export const ONBOARDING_OVERTAKE_COPY = "Pass other athletes as you train. Compete with people at your level.";

export const ONBOARDING_CARD_LABELS: Record<OnboardingFeatureId, string> = {
  growth: "Future PR slot", crews: "Future team slot", vitals: "Vitals Lab slot",
};

export function onboardingCrewPreview(draft: GuestIntroDraft): CrewWeekRelayInput {
  const distance = draft.sport === "cycling" ? 18000 : draft.sport === "walking" ? 4000 : 6000;
  return {
    sport: draft.sport, format: "relay", targetSessions: 12,
    contract: draft.sport === "strength" ? { metric: "moving_sec", target: 21600 } : { metric: "distance_m", target: distance * 5 },
    members: [
      { user_id: "you", display_name: draft.name.trim() || "Athlete", avatar_url: draft.photo ?? null },
      { user_id: "alex", display_name: "Alex" }, { user_id: "sam", display_name: "Sam" },
    ],
    entries: [
      { user_id: "you", distance_m: distance, moving_sec: 3600, session_count: 2 },
      { user_id: "alex", distance_m: distance * .8, moving_sec: 3000, session_count: 2 },
      { user_id: "sam", distance_m: distance * 1.2, moving_sec: 4200, session_count: 3 },
    ],
  };
}

/** Presentation values for the guest scan; never merged into health/account state. */
export const ONBOARDING_VITALS_METRICS: VitalsLabMetricDisplay[] = VITALS_LAB_METRICS.map(spec => ({
  ...spec,
  value: ({ hrv: "58", resp: "14", sleep: "7h 42m", rhr: "56", spo2: "98", active: "64" })[spec.id],
  status: "", delta: "", sparkline: [],
}));
