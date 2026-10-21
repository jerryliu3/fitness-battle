import { shiftAppDay, weeklyPeriodBounds } from "../period";
import { countsOnTrack, isVerifiedActivity, provenanceOf } from "./ledger";
import { type Activity, type CompeteState, type SportId } from "./sports";
export const RECORD_DISTANCES = {
  running: [
    { id: "5k", label: "5K", meters: 5000 },
    { id: "10k", label: "10K", meters: 10000 },
    { id: "half", label: "Half marathon", meters: 21097.5 },
    { id: "marathon", label: "Marathon", meters: 42195 },
  ],
  cycling: [
    { id: "50k", label: "50K", meters: 50000 },
    { id: "100k", label: "100K", meters: 100000 },
    { id: "150k", label: "150K", meters: 150000 },
    { id: "180k", label: "180K", meters: 180000 },
  ],
} as const;
export interface RecordAttempt {
  activityId: string;
  sport: "running" | "cycling";
  distanceId: string;
  startedAt: string;
  seconds: number;
  source: string;
  verified: boolean;
}
/** Whole-session times only. A longer workout's average pace is never a best split. */
export function recordAttemptsForActivity(
  a: Activity,
  now = new Date(),
): RecordAttempt[] {
  if (
    (a.sport !== "running" && a.sport !== "cycling") ||
    !countsOnTrack(a, "open") ||
    Date.parse(a.startedAt) > now.getTime() ||
    !Number.isFinite(Date.parse(a.startedAt)) ||
    !Number.isFinite(a.movingSec) ||
    a.movingSec <= 0
  )
    return [];
  return RECORD_DISTANCES[a.sport].flatMap((d) =>
    a.distanceM >= d.meters && a.distanceM <= d.meters * 1.02
      ? [
          {
            activityId: a.id,
            sport: a.sport as "running" | "cycling",
            distanceId: d.id,
            startedAt: a.startedAt,
            seconds: a.movingSec,
            source: provenanceOf(a) === "recorded" ? a.source : provenanceOf(a),
            verified: isVerifiedActivity(a),
          },
        ]
      : [],
  );
}
export function personalRecordHistory(
  state: CompeteState,
  now = new Date(),
): RecordAttempt[] {
  const local = new Set(state.activities.map((a) => a.id));
  const attempts = [
    ...(state.recordAttempts ?? []).filter((a) => !local.has(a.activityId)),
    ...state.activities.flatMap((a) => recordAttemptsForActivity(a, now)),
  ];
  const best = new Map<string, number>();
  return attempts
    .filter((a) => Date.parse(a.startedAt) <= now.getTime())
    .sort(
      (a, b) =>
        a.startedAt.localeCompare(b.startedAt) ||
        a.seconds - b.seconds ||
        a.activityId.localeCompare(b.activityId),
    )
    .filter((a) => {
      const key = `${a.sport}:${a.distanceId}`;
      if (a.seconds >= (best.get(key) ?? Infinity)) return false;
      best.set(key, a.seconds);
      return true;
    });
}
export interface TrainingWeek {
  start: string;
  end: string;
  distanceM: number;
  movingSec: number;
  sessions: number;
  partial: boolean;
}
export function weeklyTraining(
  activities: Activity[],
  sport: SportId,
  now = new Date(),
  count = 12,
): TrainingWeek[] {
  return Array.from({ length: count }, (_, i) => {
    const bounds = weeklyPeriodBounds(shiftAppDay(now, -7 * (count - 1 - i)));
    const rows = activities.filter(
      (a) =>
        a.sport === sport &&
        countsOnTrack(a, "open") &&
        Date.parse(a.startedAt) >= bounds.startsAt.getTime() &&
        Date.parse(a.startedAt) < bounds.endsAt.getTime() &&
        Date.parse(a.startedAt) <= now.getTime(),
    );
    return {
      start: bounds.startsAt.toISOString(),
      end: bounds.endsAt.toISOString(),
      distanceM: rows.reduce((t, a) => t + a.distanceM, 0),
      movingSec: rows.reduce((t, a) => t + a.movingSec, 0),
      sessions: rows.length,
      partial: now < bounds.endsAt,
    };
  });
}
/** Staircase preserves the standing record between actual improvement dates. */
export function recordStepPath(
  rows: RecordAttempt[],
  width = 300,
  height = 100,
): string {
  if (!rows.length) return "";
  const low = Math.min(...rows.map((r) => r.seconds)),
    high = Math.max(...rows.map((r) => r.seconds));
  const start = Date.parse(rows[0]!.startedAt),
    span = Math.max(1, Date.parse(rows.at(-1)!.startedAt) - start);
  const x = (r: RecordAttempt) =>
    8 + ((Date.parse(r.startedAt) - start) / span) * (width - 16);
  const y = (r: RecordAttempt) =>
    8 + ((r.seconds - low) / Math.max(1, high - low)) * (height - 16);
  return rows
    .map((r, i) => (i === 0 ? `M ${x(r)} ${y(r)}` : `H ${x(r)} V ${y(r)}`))
    .join(" ");
}
