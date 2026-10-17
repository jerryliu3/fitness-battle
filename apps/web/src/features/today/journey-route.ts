/** Horizontal lane for a stop. Position lives on the stop — the route only reads centers. */
export type JourneyLane = "l" | "c" | "r";

export type JourneyPt = { x: number; y: number };

export type JourneyLanePlan = {
  /** Top placeholder — prefers right when allowed. */
  future: JourneyLane;
  /** Ember / today stop — prefers center when allowed. */
  today: JourneyLane;
  /** Newest-first activity days, same order as the days list passed in. */
  days: JourneyLane[];
  /** Always center. */
  start: "c";
};

/** One journey circle per calendar day that has activity (UTC date from startedAt). */
export type JourneyActivityDay<T extends { startedAt: string } = { startedAt: string }> = {
  /** Stable id = YYYY-MM-DD — lanes key off this so a new day only extends the tip. */
  id: string;
  day: string;
  /** Newest-first within the day. */
  items: T[];
};

/**
 * Collapse activities into newest-first activity days.
 * Multiple workouts on the same day share one circle; a new day prepends a circle.
 */
export function groupActivitiesByDay<T extends { startedAt: string }>(
  activities: ReadonlyArray<T>,
  limit = 10,
): JourneyActivityDay<T>[] {
  const byDay = new Map<string, T[]>();
  const newestFirst = [...activities].sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  );
  for (const activity of newestFirst) {
    const day = activity.startedAt.slice(0, 10);
    const bucket = byDay.get(day);
    if (bucket) bucket.push(activity);
    else byDay.set(day, [activity]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, limit)
    .map(([day, items]) => ({ id: day, day, items }));
}

/** Next lane in the winding — never equals `prev`. */
export function nextLane(
  prev: JourneyLane,
  prefer?: JourneyLane,
): JourneyLane {
  if (prefer && prefer !== prev) return prefer;
  if (prev === "c") return "l";
  if (prev === "l") return "r";
  return "l";
}

/**
 * Assign lanes bottom-up from Start so earlier activity-days stay put when a
 * newer day is prepended (append-stable). Rules:
 * - Start is always center
 * - No lane repeats consecutively
 * - Today prefers center; future prefers right
 *
 * Display order: future → today → days(newest-first) → start
 * Assignment walk: start → oldest day → … → newest day → today → future
 */
export function planJourneyTrail(
  daysNewestFirst: ReadonlyArray<{ id: string }>,
): JourneyLanePlan {
  const byId = new Map<string, JourneyLane>();
  let prev: JourneyLane = "c"; // start

  for (const day of [...daysNewestFirst].reverse()) {
    const lane = nextLane(prev);
    byId.set(day.id, lane);
    prev = lane;
  }

  const today = nextLane(prev, "c");
  prev = today;
  const future = nextLane(prev, "r");

  return {
    future,
    today,
    days: daysNewestFirst.map((d) => byId.get(d.id)!),
    start: "c",
  };
}

/** Flat display order: future → today → days → start (for tests / callers). */
export function planJourneyLanes(
  daysNewestFirst: ReadonlyArray<{ id: string }> | number,
): JourneyLane[] {
  const days =
    typeof daysNewestFirst === "number"
      ? Array.from({ length: daysNewestFirst }, (_, i) => ({
          // Fake chronological ids so "session-0" is newest when using a count.
          id: `day-${String(i).padStart(2, "0")}`,
        }))
      : daysNewestFirst;
  const plan = planJourneyTrail(days);
  return [plan.future, plan.today, ...plan.days, plan.start];
}

/** Assert invariant used by tests and debug. */
export function lanesHaveNoConsecutiveRepeats(lanes: JourneyLane[]): boolean {
  for (let i = 1; i < lanes.length; i++) {
    if (lanes[i] === lanes[i - 1]) return false;
  }
  return true;
}

/**
 * Dashed route determinator — only input is ordered stop centers (+ width for S-bulge).
 * No lane table, no parallel coordinate system: wherever the circles sit, the path follows.
 */
export function routeThroughCenters(
  centers: JourneyPt[],
  svgWidth: number,
): string[] {
  if (centers.length < 2 || svgWidth < 1) return [];
  const segs: string[] = [];
  const bulge = Math.max(48, svgWidth * 0.26);
  for (let i = 0; i < centers.length - 1; i++) {
    const p0 = centers[i]!;
    const p1 = centers[i + 1]!;
    const midY = (p0.y + p1.y) / 2;
    const rise = p1.y - p0.y;
    if (Math.abs(p0.x - p1.x) < 4) {
      const goRight = p0.x < svgWidth * 0.5;
      const outer = goRight ? p0.x + bulge : p0.x - bulge;
      const inner = goRight ? p0.x - bulge * 0.35 : p0.x + bulge * 0.35;
      segs.push(
        `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${outer.toFixed(1)} ${(p0.y + rise * 0.28).toFixed(1)}, ${inner.toFixed(1)} ${midY.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
      );
    } else {
      segs.push(
        `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${p0.x.toFixed(1)} ${(p0.y + rise * 0.28).toFixed(1)}, ${p1.x.toFixed(1)} ${midY.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
      );
    }
  }
  return segs;
}
