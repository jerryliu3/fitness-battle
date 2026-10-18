/** Presentation only. A fixed distance window; never normalizes or changes standings. */
export interface ArenaViewWindow {
  center: number;
  span: number;
}
export interface ArenaSceneLane {
  id: string;
  name: string;
  initials: string;
  value: number;
  you?: boolean;
  ghost?: boolean;
  lastUpdated?: string;
}
export function arenaWindow(center: number, span: number) {
  const safeCenter = Number.isFinite(center) ? Math.max(0, center) : 0;
  const safeSpan = Number.isFinite(span)
    ? Math.max(0.5, Math.min(5000, span))
    : 6;
  return {
    min: safeCenter - safeSpan / 2,
    max: safeCenter + safeSpan / 2,
    center: safeCenter,
    span: safeSpan,
  };
}

/**
 * For 2D vertical lanes, ensures the starting line (0) remains near the bottom
 * of the visible track (leaving a minimal ~7% margin behind the line) rather
 * than centering on 0 and showing extensive empty space behind the start line.
 */
export function clampArenaLaneCenter(center: number, span: number): number {
  const safeSpan = Number.isFinite(span)
    ? Math.max(0.5, Math.min(5000, span))
    : 6;
  const minCenter = safeSpan * 0.43;
  const safeCenter = Number.isFinite(center) ? center : 0;
  return Math.max(minCenter, safeCenter);
}
export function arenaPosition(value: number, view: ArenaViewWindow) {
  const bounds = arenaWindow(view.center, view.span);
  return {
    fraction: Math.max(0, Math.min(1, (bounds.max - value) / bounds.span)),
    edge:
      value > bounds.max
        ? ("ahead" as const)
        : value < bounds.min
          ? ("behind" as const)
          : null,
  };
}
export function orderedArenaLanes<
  T extends { id: string; you?: boolean; ghost?: boolean },
>(lanes: readonly T[]) {
  const you = lanes.find((l) => l.you);
  const others = lanes
    .filter((l) => !l.you && !l.ghost)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  const middle = Math.floor(others.length / 2);
  return you
    ? [...others.slice(0, middle), you, ...others.slice(middle)]
    : others;
}
export function fitArenaWindow(
  lanes: readonly ArenaSceneLane[],
): ArenaViewWindow {
  const values = lanes.filter((l) => !l.ghost).map((l) => l.value);
  const low = Math.min(0, ...values),
    high = Math.max(1, ...values);
  return { center: (low + high) / 2, span: Math.max(6, (high - low) * 1.15) };
}

export interface ArenaOvertakeRival {
  id: string;
  startValue: number;
  endValue: number;
  moved: boolean;
  overtaken: boolean;
}

export interface ArenaOvertakePlan {
  youId: string;
  youBefore: number;
  youAfter: number;
  rankBefore: number;
  rankAfter: number;
  hasOvertake: boolean;
  anyRivalMoved: boolean;
  overtakenIds: string[];
  /**
   * Normalized progress [0, 1] where Beat 1 (rival slide) ends and Beat 2
   * (your move) begins. 0 when no overtake occurs or no rivals moved.
   */
  rivalSlideEnd: number;
  durationMs: number;
  rivals: Record<string, ArenaOvertakeRival>;
}

export interface ArenaRivalPassEffect {
  isPassed: boolean;
  ripple: number;
  impact: number;
  joltX: number;
}

export interface ArenaOvertakeFrame {
  progress: number;
  phase: "rival-slide" | "charge" | "overtake" | "settle" | "done";
  youValue: number;
  viewCenter: number;
  speed: number;
  charging: number;
  finish: number;
  currentRank: number;
  passedCount: number;
  laneValues: Record<string, number>;
  rivalEffects: Record<string, ArenaRivalPassEffect>;
}

export interface ArenaBaselineSnapshot {
  version: 1;
  periodStart: string;
  unit?: string;
  values: Record<string, number>;
}

const EPSILON = 1e-6;
const MIN_MOVEMENT = 0.01;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function between01(x: number, a: number, b: number): number {
  if (b <= a) return x >= b ? 1 : 0;
  return clamp01((x - a) / (b - a));
}

function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

function cosinePulse(x: number, center: number, radius: number): number {
  const d = Math.abs(x - center) / Math.max(EPSILON, radius);
  return d >= 1 ? 0 : (1 + Math.cos(d * Math.PI)) / 2;
}

/**
 * Reconciles previous vs. current lane positions when the user gains distance/effort.
 * - If the user overtakes at least one rival AND rivals also moved since last sync,
 *   schedules a two-beat stagger (Beat 1: rivals slide to new positions; Beat 2: you overtake).
 * - If the user does NOT overtake anyone, rivals start already at their updated positions
 *   and only the user's avatar animates from previous to new distance.
 */
export function reconcileArenaOvertake(
  lanes: readonly ArenaSceneLane[],
  previousValues: Readonly<Record<string, number>> | null | undefined,
): ArenaOvertakePlan | null {
  if (!previousValues) return null;
  const you = lanes.find((lane) => lane.you && !lane.ghost);
  if (!you) return null;
  const youBefore = previousValues[you.id];
  if (typeof youBefore !== "number" || !Number.isFinite(youBefore)) return null;
  const youAfter = you.value;
  const delta = youAfter - youBefore;
  if (delta <= MIN_MOVEMENT) return null;

  const rivalLanes = lanes.filter((lane) => !lane.you && !lane.ghost);
  const rivals: Record<string, ArenaOvertakeRival> = {};
  const overtakenIds: string[] = [];
  let anyRivalMoved = false;

  for (const rival of rivalLanes) {
    const rawBefore = previousValues[rival.id];
    const validBefore =
      typeof rawBefore === "number" && Number.isFinite(rawBefore)
        ? rawBefore
        : rival.value;
    const overtaken =
      validBefore > youBefore + EPSILON &&
      rival.value >= youBefore - EPSILON &&
      youAfter > rival.value + EPSILON;
    if (overtaken) overtakenIds.push(rival.id);
    const moved = Math.abs(rival.value - validBefore) > MIN_MOVEMENT;
    if (moved) anyRivalMoved = true;
    rivals[rival.id] = {
      id: rival.id,
      startValue: validBefore,
      endValue: rival.value,
      moved,
      overtaken,
    };
  }

  const hasOvertake = overtakenIds.length > 0;
  if (!hasOvertake) {
    anyRivalMoved = false;
    for (const rival of Object.values(rivals)) {
      rival.startValue = rival.endValue;
      rival.moved = false;
    }
  }

  const rivalSlideEnd = hasOvertake && anyRivalMoved ? 0.22 : 0;
  const durationMs =
    hasOvertake && anyRivalMoved ? 2400 : hasOvertake ? 2000 : 1500;

  const rankBefore =
    1 +
    Object.values(rivals).filter(
      (rival) => rival.startValue > youBefore + EPSILON,
    ).length;
  const rankAfter =
    1 + Object.values(rivals).filter((rival) => rival.endValue > youAfter + EPSILON).length;

  return {
    youId: you.id,
    youBefore,
    youAfter,
    rankBefore,
    rankAfter,
    hasOvertake,
    anyRivalMoved,
    overtakenIds,
    rivalSlideEnd,
    durationMs,
    rivals,
  };
}

/**
 * Evaluates a single frame of an ArenaOvertakePlan at normalized progress [0, 1].
 */
export function stepArenaOvertake(
  plan: ArenaOvertakePlan,
  progress: number,
  span: number,
): ArenaOvertakeFrame {
  const p = clamp01(progress);
  const safeSpan = Number.isFinite(span) ? Math.max(0.5, span) : 6;
  const delta = plan.youAfter - plan.youBefore;

  let rivalT = 1;
  let travelT = 0;
  let youValue = plan.youBefore;
  let speed = 0;
  let charging = 0;
  let finish = 0;
  let phase: ArenaOvertakeFrame["phase"] = "overtake";

  if (p < plan.rivalSlideEnd) {
    rivalT = easeInOutCubic(p / plan.rivalSlideEnd);
    charging =
      Math.sin(between01(p, plan.rivalSlideEnd * 0.45, plan.rivalSlideEnd) * Math.PI) *
      0.55;
    phase = "rival-slide";
  } else {
    const runP = between01(p, plan.rivalSlideEnd, 1);
    charging = Math.sin(between01(runP, 0, 0.14) * Math.PI);
    const rawRun = between01(runP, 0.08, 0.88);
    travelT = easeInOutCubic(rawRun);
    youValue = plan.youBefore + delta * travelT;
    speed = Math.sin(rawRun * Math.PI);
    finish = easeOutCubic(between01(runP, 0.86, 1));
    phase =
      p >= 1
        ? "done"
        : runP < 0.08
          ? "charge"
          : runP < 0.88
            ? "overtake"
            : "settle";
  }

  const passWindow = Math.max(0.15, Math.min(delta * 0.65, safeSpan * 0.14));
  const laneValues: Record<string, number> = { [plan.youId]: youValue };
  const rivalEffects: Record<string, ArenaRivalPassEffect> = {};

  for (const rival of Object.values(plan.rivals)) {
    laneValues[rival.id] =
      rival.startValue + (rival.endValue - rival.startValue) * rivalT;

    if (!rival.overtaken || p < plan.rivalSlideEnd) {
      rivalEffects[rival.id] = { isPassed: false, ripple: 0, impact: 0, joltX: 0 };
      continue;
    }
    const passAt = Math.max(plan.youBefore, rival.endValue);
    const isPassed = youValue > passAt + EPSILON;
    const ripple = isPassed ? clamp01((youValue - passAt) / passWindow) : 0;
    const impact =
      cosinePulse(youValue, passAt + passWindow * 0.2, passWindow * 0.65) *
      (1 - finish);
    const joltX = Math.sin(impact * Math.PI * 3) * impact * 5;
    rivalEffects[rival.id] = { isPassed, ripple, impact, joltX };
  }

  const passedCount = plan.overtakenIds.filter(
    (id) =>
      youValue >
      Math.max(plan.youBefore, plan.rivals[id]?.endValue ?? Infinity) + EPSILON,
  ).length;
  const currentRank =
    1 +
    Object.values(plan.rivals).filter(
      (rival) => (laneValues[rival.id] ?? rival.endValue) > youValue + EPSILON,
    ).length;

  const leadOffset = Math.min(delta, safeSpan * 0.33) * (1 - travelT);
  const viewCenter = clampArenaLaneCenter(youValue + leadOffset, safeSpan);

  return {
    progress: p,
    phase,
    youValue,
    viewCenter,
    speed,
    charging,
    finish,
    currentRank,
    passedCount,
    laneValues,
    rivalEffects,
  };
}

export function formatArenaOvertakeStatus(
  plan: ArenaOvertakePlan,
  frame: ArenaOvertakeFrame | null,
  unit: string,
): { headline: string; detail: string | null } {
  const gain = `+${(plan.youAfter - plan.youBefore).toFixed(1)} ${unit}`;
  if (frame && frame.phase !== "done") {
    if (frame.phase === "rival-slide") {
      return { headline: "Updating field positions…", detail: null };
    }
    return { headline: `Making your move · ${gain}`, detail: null };
  }
  if (plan.hasOvertake) {
    const count = plan.overtakenIds.length;
    const noun = count === 1 ? "overtake" : "overtakes";
    const rankLabel =
      plan.rankBefore !== plan.rankAfter
        ? `#${plan.rankBefore} → #${plan.rankAfter}`
        : `#${plan.rankAfter}`;
    return {
      headline: rankLabel,
      detail: `${count} ${noun}`,
    };
  }
  return {
    headline: gain,
    detail: "moved forward",
  };
}

export function arenaBaselineStorageKey(
  accountKey: string,
  sport: string,
  track: string,
): string {
  return `fb-arena-baseline:${accountKey}:${sport}:${track}`;
}

export function readArenaBaseline(
  raw: string | null,
  periodStart: string,
  unit?: string,
): Record<string, number> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ArenaBaselineSnapshot;
    if (
      parsed?.version !== 1 ||
      parsed.periodStart !== periodStart ||
      (unit && parsed.unit && parsed.unit !== unit) ||
      !parsed.values ||
      typeof parsed.values !== "object"
    ) {
      return null;
    }
    const result: Record<string, number> = {};
    for (const [key, val] of Object.entries(parsed.values)) {
      if (typeof val === "number" && Number.isFinite(val)) {
        result[key] = val;
      }
    }
    return result;
  } catch {
    return null;
  }
}

export function serializeArenaBaseline(
  periodStart: string,
  lanes: readonly { id: string; value: number; ghost?: boolean }[],
  unit?: string,
): string {
  const values: Record<string, number> = {};
  for (const lane of lanes) {
    if (lane.ghost) continue;
    values[lane.id] = Math.round(lane.value * 1000) / 1000;
  }
  const snapshot: ArenaBaselineSnapshot = {
    version: 1,
    periodStart,
    ...(unit ? { unit } : {}),
    values,
  };
  return JSON.stringify(snapshot);
}


