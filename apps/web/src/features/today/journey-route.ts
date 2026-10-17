/** Horizontal lane for a stop. Position lives on the stop — the route only reads centers. */
export type JourneyLane = "l" | "c" | "r";

export type JourneyPt = { x: number; y: number };

export type JourneyLanePlan = {
  /** Top placeholder — prefers right when allowed. */
  future: JourneyLane;
  /** Ember / today stop — prefers center when allowed. */
  today: JourneyLane;
  /** Newest-first, same order as the sessions list passed in. */
  sessions: JourneyLane[];
  /** Always center. */
  start: "c";
};

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
 * Assign lanes bottom-up from Start so earlier stops stay put when a newer
 * session is prepended (append-stable). Rules:
 * - Start is always center
 * - No lane repeats consecutively
 * - Today prefers center; future prefers right
 *
 * Display order is still future → today → sessions(newest-first) → start;
 * assignment walks start → oldest session → … → newest → today → future.
 */
export function planJourneyTrail(
  sessionsNewestFirst: ReadonlyArray<{ id: string }>,
): JourneyLanePlan {
  const byId = new Map<string, JourneyLane>();
  let prev: JourneyLane = "c"; // start

  // Oldest → newest so a newly logged session only extends the tip.
  for (const session of [...sessionsNewestFirst].reverse()) {
    const lane = nextLane(prev);
    byId.set(session.id, lane);
    prev = lane;
  }

  const today = nextLane(prev, "c");
  prev = today;
  const future = nextLane(prev, "r");

  return {
    future,
    today,
    sessions: sessionsNewestFirst.map((s) => byId.get(s.id)!),
    start: "c",
  };
}

/** Flat display order: future → today → sessions → start (for tests / callers). */
export function planJourneyLanes(
  sessionsNewestFirst: ReadonlyArray<{ id: string }> | number,
): JourneyLane[] {
  const sessions =
    typeof sessionsNewestFirst === "number"
      ? Array.from({ length: sessionsNewestFirst }, (_, i) => ({
          id: `session-${i}`,
        }))
      : sessionsNewestFirst;
  const plan = planJourneyTrail(sessions);
  return [plan.future, plan.today, ...plan.sessions, plan.start];
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
