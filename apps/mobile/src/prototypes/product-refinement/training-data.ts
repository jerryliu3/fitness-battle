import {
  trainingBuckets,
  trainingComparison,
  type Activity,
  type SportId,
  type TrainingRange,
  shiftAppDay,
  shiftTrainingMonth,
} from "@fitness-battle/shared";
/** Fictional review rows only. Shared readers retain production calendar/filter semantics. */
export const trainingNow = new Date("2026-10-25T18:00:00Z");
export const trainingRows: Activity[] = Array.from(
  { length: 298 },
  (_, i): Activity | null => {
    const at = new Date(Date.UTC(2026, 0, i + 1, 12));
    const weekday = at.getUTCDay();
    if (
      at > trainingNow ||
      weekday === 2 ||
      weekday === 5 ||
      at.toISOString().startsWith("2026-10-14")
    )
      return null;
    const sport: SportId =
      weekday === 3 ? "strength" : weekday === 6 ? "cycling" : "running";
    const minutes =
      sport === "cycling"
        ? 65 + (i % 4) * 10
        : sport === "strength"
          ? 40
          : 30 + (i % 5) * 8;
    return {
      id: `training-${i}`,
      sport,
      startedAt: at.toISOString(),
      movingSec: minutes * 60,
      distanceM:
        sport === "strength"
          ? 0
          : (minutes / (sport === "cycling" ? 3 : 9)) * 1609.344,
      avgHr: null,
      verified: sport !== "strength",
      source: sport === "strength" ? "manual" : "strava",
      provenance: sport === "strength" ? "manual" : "recorded",
      disposition: "counted",
    } satisfies Activity;
  },
).filter((row): row is Activity => row !== null);
export function trainingView(
  range: TrainingRange,
  anchor: Date,
  sport: SportId | "all",
) {
  const buckets = trainingBuckets(
    trainingRows,
    sport,
    range,
    anchor,
    trainingNow,
  ).filter((b) => Date.parse(b.start) <= trainingNow.getTime());
  const rows = trainingRows.filter(
    (a) =>
      (sport === "all" || a.sport === sport) &&
      Date.parse(a.startedAt) >= Date.parse(buckets[0]!.start) &&
      Date.parse(a.startedAt) < Date.parse(buckets.at(-1)!.end),
  );
  const priorAnchor =
    range === "week"
      ? shiftAppDay(anchor, -7)
      : shiftTrainingMonth(anchor, range === "year" ? -12 : -1);
  const priorBuckets = trainingBuckets(
    trainingRows,
    sport,
    range,
    priorAnchor,
    trainingNow,
  );
  const priorRows = trainingRows.filter(
    (a) =>
      (sport === "all" || a.sport === sport) &&
      a.startedAt >= priorBuckets[0]!.start &&
      a.startedAt < priorBuckets.at(-1)!.end,
  );
  return {
    buckets,
    rows,
    priorRows,
    priorBuckets,
    hours: rows.reduce((n, a) => n + a.movingSec, 0) / 3600,
    comparison: trainingComparison(
      trainingRows,
      sport,
      range,
      anchor,
      trainingNow,
    ),
  };
}
export const sportName = (sport: string) =>
  ({
    running: "Running",
    cycling: "Cycling",
    strength: "Strength",
    all: "All sports",
  })[sport] ?? sport;
export const sessionName = (a: Activity) =>
  a.sport === "cycling"
    ? "Weekend spin"
    : a.sport === "strength"
      ? "Strength foundations"
      : new Date(a.startedAt).getUTCDay() === 0
        ? "Sunday long run"
        : "Morning miles";
export const shortDate = (at: string) =>
  new Date(at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
