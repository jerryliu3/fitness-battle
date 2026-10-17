import { APP_TIMEZONE, endOfZonedDay } from "../period";
import { periodEffort } from "./effort";
import { athleteWeekEffort, type FieldAthlete } from "./field";
import {
  clamp,
  hashString,
  sportById,
  unitInterval,
  type Activity,
  type ScoreTrack,
  type SportId,
} from "./sports";

/** Three scrub points inside a weekly period: early, mid, and live cutoff. */
export type CheckpointIndex = 0 | 1 | 2;

export interface CheckpointSeries {
  /** Effort points at each cutoff. */
  effort: [number, number, number];
  /** Distance in meters at each cutoff (GPS sports). */
  distanceM: [number, number, number];
  /** Moving seconds at each cutoff (non-GPS sports). */
  movingSec: [number, number, number];
  /** Human labels for the scrubber. */
  labels: [string, string, string];
  /** Instant used for the live (third) cutoff. */
  liveAt: Date;
}

const DAY_MS = 86_400_000;

function endOfPeriodDay(dayStart: Date): Date {
  return endOfZonedDay(dayStart, APP_TIMEZONE);
}

function labelDay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: APP_TIMEZONE,
  });
}

/**
 * Weekday names collapse early in a wave (the three cutoffs can share one UTC
 * day). Name the scrub positions so the control still has three distinct stops.
 */
export function checkpointLabels(
  dates: [Date, Date, Date],
): [string, string, string] {
  const weekdays = dates.map(labelDay) as [string, string, string];
  if (new Set(weekdays).size === weekdays.length) return weekdays;
  if (weekdays[0] !== weekdays[1] && weekdays[1] === weekdays[2]) {
    return [weekdays[0], weekdays[1], "Now"];
  }
  if (weekdays[0] === weekdays[1] && weekdays[1] !== weekdays[2]) {
    return ["Early", weekdays[1], weekdays[2]];
  }
  return ["Early", "Mid", "Now"];
}

/**
 * Cutoff instants for the scrubber: end of day 0, end of day 2, and now
 * (clamped into the half-open period). Mirrors the Split prototype's three
 * progressive snapshots without hard-coding Mon/Tue/Thu.
 */
export function checkpointInstants(
  periodStart: Date,
  periodEnd: Date,
  now: Date = new Date(),
): [Date, Date, Date] {
  const live = new Date(
    clamp(periodStart.getTime(), periodEnd.getTime() - 1, now.getTime()),
  );
  const early = new Date(
    Math.min(endOfPeriodDay(periodStart).getTime(), live.getTime()),
  );
  const midCandidate = new Date(periodStart.getTime() + 3 * DAY_MS);
  const mid = new Date(
    Math.min(
      Math.max(midCandidate.getTime(), early.getTime()),
      live.getTime(),
    ),
  );
  return [early, mid, live];
}

export function volumeThrough(
  activities: Activity[],
  sport: SportId,
  periodStart: Date,
  through: Date,
  track: ScoreTrack,
): { effort: number; distanceM: number; movingSec: number } {
  return periodEffort(activities, sport, periodStart, through, track);
}

/** Build checkpoint series from real activities for the signed-in athlete. */
export function activityCheckpoints(
  activities: Activity[],
  sport: SportId,
  periodStart: Date,
  periodEnd: Date,
  track: ScoreTrack,
  now: Date = new Date(),
): CheckpointSeries {
  const [early, mid, live] = checkpointInstants(periodStart, periodEnd, now);
  const volumes = [early, mid, live].map((through) =>
    volumeThrough(activities, sport, periodStart, through, track),
  );
  return {
    effort: [volumes[0]!.effort, volumes[1]!.effort, volumes[2]!.effort],
    distanceM: [
      volumes[0]!.distanceM,
      volumes[1]!.distanceM,
      volumes[2]!.distanceM,
    ],
    movingSec: [
      volumes[0]!.movingSec,
      volumes[1]!.movingSec,
      volumes[2]!.movingSec,
    ],
    labels: checkpointLabels([early, mid, live]),
    liveAt: live,
  };
}

/**
 * Synthetic rivals only expose week totals. Spread them across checkpoints with
 * a stable growth curve so the scrubber still feels progressive.
 */
export function syntheticCheckpoints(
  totalEffort: number,
  totalDistanceM: number,
  totalMovingSec: number,
  seed: string,
  periodStart: Date,
  periodEnd: Date,
  now: Date = new Date(),
): CheckpointSeries {
  const [early, mid, live] = checkpointInstants(periodStart, periodEnd, now);
  const earlyShare = 0.22 + unitInterval(`${seed}:early`) * 0.18;
  const midShare = Math.min(
    0.92,
    earlyShare + 0.28 + unitInterval(`${seed}:mid`) * 0.22,
  );
  const shares = [earlyShare, midShare, 1] as const;
  return {
    effort: [
      totalEffort * shares[0],
      totalEffort * shares[1],
      totalEffort * shares[2],
    ],
    distanceM: [
      totalDistanceM * shares[0],
      totalDistanceM * shares[1],
      totalDistanceM * shares[2],
    ],
    movingSec: [
      totalMovingSec * shares[0],
      totalMovingSec * shares[1],
      totalMovingSec * shares[2],
    ],
    labels: checkpointLabels([early, mid, live]),
    liveAt: live,
  };
}

/**
 * Estimate meters for synthetic field athletes. Effort on GPS sports is mostly
 * kilometers, so effort ≈ km is a fair presentation proxy until rival GPS lands.
 */
export function athleteWeekDistanceM(
  athlete: FieldAthlete,
  periodStart: string,
  track: ScoreTrack,
  sport: SportId,
): number {
  const effort = athleteWeekEffort(athlete, periodStart, track);
  if (!sportById(sport).gps) {
    // Strength-style effort is hours-based; invent a proportional "volume" meter.
    return Math.round(effort * 400);
  }
  const paceNoise = 0.92 + unitInterval(`${athlete.id}:pace`) * 0.16;
  return Math.round(effort * 1000 * paceNoise);
}

export function athleteWeekMovingSec(
  athlete: FieldAthlete,
  periodStart: string,
  track: ScoreTrack,
  sport: SportId,
): number {
  const effort = athleteWeekEffort(athlete, periodStart, track);
  if (!sportById(sport).gps) {
    // effort ≈ hours * 8 → hours = effort / 8
    return Math.round((effort / 8) * 3600);
  }
  const minPerKm = 5.2 + unitInterval(`${athlete.id}:tempo`) * 1.4;
  const km = athleteWeekDistanceM(athlete, periodStart, track, sport) / 1000;
  return Math.round(km * minPerKm * 60);
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

/** Label for the viewer's own row — Guest when unsigned, You when signed in. */
export function selfLaneLabel(
  name: string,
  style: "title" | "caps" = "title",
): string {
  // Only the unsigned default is Guest. Legacy onboarded "You" stays "You".
  const guest = name === "Guest";
  if (style === "caps") return guest ? "GUEST" : "YOU";
  return guest ? "Guest" : "You";
}

/** Axis ceiling for the Split effort track — pads the current field max. */
export function effortTrackMax(values: number[]): number {
  const peak = Math.max(20, ...values, 0);
  const stepped = Math.ceil(peak / 20) * 20;
  return Math.max(40, stepped + (peak > stepped * 0.85 ? 20 : 0));
}

/** Axis ceiling for distance path / pursuit (km). */
export function distanceTrackMaxKm(valuesKm: number[]): number {
  const peak = Math.max(5, ...valuesKm, 0);
  return Math.ceil(peak / 5) * 5 + (peak > 0 ? 5 : 0);
}

export function interpolateSeries(
  series: [number, number, number],
  checkpoint: number,
): number {
  const t = clamp(0, 2, checkpoint);
  const i = Math.min(1, Math.floor(t));
  const fraction = t - i;
  return series[i]! + (series[i + 1]! - series[i]!) * fraction;
}

/** Stable hash helper retained for UI seeds (dialog keys, colors). */
export function trackSeed(value: string): number {
  return hashString(value);
}
