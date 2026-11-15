import { dayKey, shiftAppDay } from "../period";
import type { DailyHealthSample } from "../fitness/types";
import {
  dispositionOf,
  isSampleActivity,
  provenanceOf,
  type ActivityProvenance,
} from "./activity-meta";
import type { Activity, SportId } from "./sports";

/** Sessions stored for the athlete but never scored, shared on fields, or shown to rivals. */
export function isJournalActivity(activity: Activity): boolean {
  if (isSampleActivity(activity)) return false;
  if (activity.journalOnly) return true;
  if (provenanceOf(activity) === "manual") return true;
  if (activity.sport === "walking") {
    const p = provenanceOf(activity);
    return p === "recorded" || p === "imported";
  }
  return false;
}

const TRAINING_PROVENANCES: Set<ActivityProvenance> = new Set([
  "recorded",
  "imported",
  "manual",
]);

/** Personal training views: journal rows and compete rows, never demos or excluded tracker rows. */
export function countsForTraining(activity: Activity): boolean {
  if (isSampleActivity(activity)) return false;
  if (dispositionOf(activity) !== "counted") return false;
  return TRAINING_PROVENANCES.has(provenanceOf(activity));
}

/** Max step reading for an Eastern day across providers. */
export function maxStepsOnDay(
  dailyHealth: readonly DailyHealthSample[] | undefined,
  day: string,
): number {
  let best = 0;
  for (const row of dailyHealth ?? []) {
    if (row.day !== day) continue;
    if (typeof row.steps !== "number" || !Number.isFinite(row.steps)) continue;
    best = Math.max(best, Math.max(0, Math.round(row.steps)));
  }
  return best;
}

/** Steps that count toward walking compete for [periodStart, periodEnd), including partial today. */
export function walkingStepsInPeriod(
  dailyHealth: readonly DailyHealthSample[] | undefined,
  periodStart: Date,
  periodEnd: Date,
  now: Date,
): number {
  const startMs = periodStart.getTime();
  const endMs = periodEnd.getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  const cap = Math.min(endMs, nowMs);
  let total = 0;
  let cursor = new Date(startMs);
  while (cursor.getTime() < cap) {
    total += maxStepsOnDay(dailyHealth, dayKey(cursor));
    cursor = shiftAppDay(cursor, 1);
  }
  return total;
}

export function formatWalkingSteps(steps: number): string {
  const n = Math.max(0, Math.round(steps));
  return n.toLocaleString("en-US");
}

export function isWalkingStepsSport(sport: SportId): boolean {
  return sport === "walking";
}