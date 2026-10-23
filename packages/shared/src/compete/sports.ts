import type {
  CategoryFocus,
  HealthPeriodResult,
  HealthRating,
  SleepNight,
} from "./health";
import type { WaveEnrollment } from "../matching/types";
import type { PeriodKind } from "../types";

/** Starting effort score for signed-in accounts (and after first join). */
export const ELO_BASE = 1000;
/** Guest / pre-account default — baseline 500 until account creation. */
export const ELO_UNRANKED = 500;
export const ELO_FLOOR = 500;
export const ELO_CAP = 2400;
export const ELO_K = 24;
export const INACTIVITY_DECAY = 12;
export const STARTING_FREEZES = 3;

export const SPORT_IDS = ["running", "cycling", "walking", "strength"] as const;
export type SportId = (typeof SPORT_IDS)[number];

export interface Sport {
  id: SportId;
  name: string;
  /** Distance from a GPS trace is the main effort signal. */
  gps: boolean;
  blurb: string;
  /** Baseline min/km pace for scaling pace bonus (faster than baseline receives bonus). */
  basePaceMinPerKm?: number;
}

export const SPORTS: Sport[] = [
  {
    id: "running",
    name: "Running",
    gps: true,
    blurb: "Distance first. Heart rate and pace only nudge the score.",
    basePaceMinPerKm: 6.5,
  },
  {
    id: "cycling",
    name: "Cycling",
    gps: true,
    blurb: "Ride distance, with a small bump for effort and speed.",
    basePaceMinPerKm: 3.0,
  },
  {
    id: "walking",
    name: "Walking",
    gps: true,
    blurb: "Time on your feet, counted as distance.",
    basePaceMinPerKm: 12.0,
  },
  {
    id: "strength",
    name: "Strength",
    gps: false,
    blurb: "Session time. Indoor work stays on the open score.",
  },
];

export function sportById(id: SportId): Sport {
  const sport = SPORTS.find((item) => item.id === id);
  if (!sport) throw new Error(`unknown_sport:${id}`);
  return sport;
}

export const PROVIDER_IDS = [
  "strava",
  "garmin",
  "apple_health",
  "google_health",
  "whoop",
  "oura",
] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface Provider {
  id: ProviderId;
  name: string;
  /** Activity files versus a daily recovery/sleep benchmark. */
  kind: "activity" | "readiness";
  blurb: string;
}

export const PROVIDERS: Provider[] = [
  {
    id: "strava",
    name: "Strava",
    kind: "activity",
    blurb: "Runs and rides",
  },
  {
    id: "garmin",
    name: "Garmin",
    kind: "activity",
    blurb: "Watch activities and sleep",
  },
  {
    id: "apple_health",
    name: "Apple Health",
    kind: "activity",
    blurb: "iOS workouts and sleep",
  },
  {
    id: "google_health",
    name: "Health Connect",
    kind: "activity",
    blurb: "Android workouts and sleep",
  },
  {
    id: "whoop",
    name: "WHOOP",
    kind: "readiness",
    blurb: "Sleep, recovery, and strain",
  },
  {
    id: "oura",
    name: "Oura",
    kind: "readiness",
    blurb: "Sleep and readiness",
  },
];

export type ScoreTrack = "verified" | "open";

/** Product competition lens. Both ledgers remain available for historical compatibility. */
export function competitionTrack(sport: SportId): ScoreTrack {
  return sport === "running" || sport === "cycling" ? "verified" : "open";
}
export function competitionTrackLabel(sport: SportId): string {
  return competitionTrack(sport) === "verified" ? "GPS Tracked" : "Open";
}

export interface SeasonClock {
  /** Weekly for now. Daily, monthly, and custom already exist on the period helper. */
  kind: PeriodKind;
  /** Inclusive start of the open scoring window. */
  periodStart: string;
}

export interface Rating {
  sport: SportId;
  verifiedElo: number;
  openElo: number;
  optedIn: boolean;
  /** Elo used to build this period's group. Keeps the board from reshuffling mid-week. */
  lockVerified: number;
  lockOpen: number;
  lockPeriod: string;
}

export interface Activity {
  id: string;
  sport: SportId;
  startedAt: string;
  distanceM: number;
  movingSec: number;
  avgHr: number | null;
  /**
   * GPS session recorded by a tracker. File imports and sample history are
   * not verified even when this flag was set by an older client.
   */
  verified: boolean;
  source: ProviderId | "history" | "manual";
  /** recorded | imported | manual | demo. Missing means recorded, except history. */
  provenance?: "recorded" | "imported" | "manual" | "demo";
  /** counted | pending | excluded. Missing means counted. */
  disposition?: "counted" | "pending" | "excluded";
  dispositionReason?: string;
}

export interface ReadinessMark {
  id: string;
  provider: ProviderId;
  day: string;
  /** 0–100 recovery or sleep benchmark. */
  score: number;
}

export interface Duel {
  id: string;
  sport: SportId;
  periodStart: string;
  rivalId: string;
  rivalName: string;
  rivalElo: number;
  source: "auto" | "invite";
}

export type LinkStatus = "disconnected" | "stub" | "connected";

export interface ProviderLink {
  provider: ProviderId;
  linked: boolean;
  /** Honest connection evidence. Stub means demo sync, not live OAuth. */
  status: LinkStatus;
}

export type GoalDistance = "5k" | "10k" | "half" | "marathon";

export interface TrainingGoal {
  distance: GoalDistance;
  /** Race or target day, YYYY-MM-DD. */
  deadline: string;
}

/** Locked snapshot written when a weekly period settles. */
export interface PeriodResult {
  id: string;
  periodStart: string;
  periodEnd: string;
  sport: SportId;
  track: ScoreTrack;
  /** 1-based place in the matched field. */
  place: number;
  fieldSize: number;
  effort: number;
  distanceM: number;
  movingSec: number;
  eloBefore: number;
  eloAfter: number;
  frozen: boolean;
  settledAt: string;
  /**
   * When the week-complete reveal was dismissed. Null/undefined means pending.
   * Durable receipt flag — prefer this over a separate pending id list.
   */
  acknowledgedAt?: string | null;
}

/** Display preference for distance. Default US customary (miles). */
export type UnitSystem = "us" | "metric";

export interface CompeteState {
  /** Durable qualifying session receipts, including sessions beyond the activity load window. */
  recordAttempts?: import("./progress").RecordAttempt[];
  /** Rank-priced weekly activity awards; persisted independently of capped result history. */
  effortMilestones?: import("./milestones").EffortMilestone[];
  version: 1;
  name: string;
  city: string;
  avatarUrl?: string | null;
  /** Miles (us) or kilometres (metric). Chosen in onboarding; changeable later. */
  units: UnitSystem;
  primary: SportId;
  /** Which category My track and the field are showing. */
  focus: CategoryFocus;
  clock: SeasonClock;
  ratings: Rating[];
  activities: Activity[];
  readiness: ReadinessMark[];
  /** Nightly sleep readings. Separate from workout activities. */
  sleepNights: SleepNight[];
  healthRatings: HealthRating[];
  /** Closed sleep weeks, newest first. */
  healthResults: HealthPeriodResult[];
  links: ProviderLink[];
  freezesLeft: number;
  /** Period starts the player froze. Elo is held when that period closes. */
  frozenPeriods: string[];
  duels: Duel[];
  lessonDoneOn: string | null;
  /** True after the one-time 90-day history calibration. Cannot be undone. */
  calibrated: boolean;
  /** Onboarding preferences finished (name/city/sport + optional connect/backfill). */
  onboardingCompleted: boolean;
  /** Lifetime count of field overtakes (server-owned; read from profile). */
  lifetimeOvertakes: number;
  /** Closed-week placements and Elo transitions (newest first, capped). */
  periodResults: PeriodResult[];
  /** Result ids waiting for the week-complete reveal UI. */
  pendingRevealIds: string[];
  /** Race or target day. Today's suggestion is derived from this plus counted runs. */
  trainingGoal: TrainingGoal | null;
  /**
   * Demo/QA clock override. When set, period math uses this instant instead of
   * wall time so "close this week" stays settled across reloads.
   */
  demoNow?: string | null;
  /**
   * Per-sport enrollments. The open week is Monday 00:00 through the next Monday in America/New_York.
   * Solo densify matching is per-viewer; when `crewBoard` is set for a sport,
   * that sport’s enrollment is pinned to the crew’s shared individual field.
   */
  enrollments: WaveEnrollment[];
  /**
   * Optional private-crew field pin, set only when the athlete chooses
   * “together” at join (or switches mid-week). Alone keeps normal density
   * matching even if they belong to a crew. Team-vs-team is future work.
   */
  crewBoard: CrewBoardPin | null;
}

/** Shared individual field for one private crew this week. */
export interface CrewBoardPin {
  crewId: string;
  crewName: string;
  sport: SportId;
  waveStart: string;
  weekEnd: string;
  capacity: number;
  memberIds: string[];
  members: CrewBoardMember[];
  syntheticIds: string[];
}

export interface CrewBoardMember {
  avatarUrl?: string | null;
  id: string;
  name: string;
  elo: number;
  /** Counted Open volume; Verified volume is kept separately. */
  distanceM?: number;
  movingSec?: number;
  verifiedDistanceM?: number;
  verifiedMovingSec?: number;
  verifiedElo?: number;
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function unitInterval(value: string): number {
  return (hashString(value) % 10000) / 10000;
}

export function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

export { dayKey } from "../period";

