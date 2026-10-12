import type { PeriodKind } from "../types";

export const ELO_BASE = 1000;
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
}

export const SPORTS: Sport[] = [
  {
    id: "running",
    name: "Running",
    gps: true,
    blurb: "Distance first. Heart rate and pace only nudge the score.",
  },
  {
    id: "cycling",
    name: "Cycling",
    gps: true,
    blurb: "Ride distance, with a small bump for effort and speed.",
  },
  {
    id: "walking",
    name: "Walking",
    gps: true,
    blurb: "Time on your feet, counted as distance.",
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
    blurb: "Watch activities",
  },
  {
    id: "apple_health",
    name: "Apple Health",
    kind: "activity",
    blurb: "iPhone workouts",
  },
  {
    id: "google_health",
    name: "Health Connect",
    kind: "activity",
    blurb: "Android workouts",
  },
  {
    id: "whoop",
    name: "WHOOP",
    kind: "readiness",
    blurb: "Recovery and strain",
  },
  {
    id: "oura",
    name: "Oura",
    kind: "readiness",
    blurb: "Sleep and readiness",
  },
];

export type ScoreTrack = "verified" | "open";

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
  /** GPS trace or a device benchmark that is hard to type in by hand. */
  verified: boolean;
  source: ProviderId | "history";
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

export interface CompeteState {
  version: 1;
  name: string;
  city: string;
  primary: SportId;
  clock: SeasonClock;
  ratings: Rating[];
  activities: Activity[];
  readiness: ReadinessMark[];
  links: { provider: ProviderId; linked: boolean }[];
  freezesLeft: number;
  /** Period starts the player froze. Elo is held when that period closes. */
  frozenPeriods: string[];
  duels: Duel[];
  lessonDoneOn: string | null;
  calibrated: boolean;
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

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
