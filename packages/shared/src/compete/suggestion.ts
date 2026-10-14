import { dispositionOf, provenanceOf } from "./ledger";
import type { Activity, CompeteState, GoalDistance, TrainingGoal } from "./sports";

/** Recreational race targets. The shapes follow common public plans, not a copied workout table. */
export type { GoalDistance, TrainingGoal } from "./sports";

export type SuggestionKind = "rest" | "easy" | "long" | "quality" | "race";
export type PlanPhase = "base" | "build" | "peak" | "taper" | "past";

export interface DaySuggestion {
  kind: SuggestionKind;
  phase: PlanPhase;
  title: string;
  detail: string;
  /** Suggested minutes. Null on a pure rest day. */
  minutes: number | null;
  /** Suggested kilometers. Null on rest or when we only have a time. */
  distanceKm: number | null;
  reason: string;
  pattern: string;
}

const PLANS: Record<
  GoalDistance,
  {
    label: string;
    standardWeeks: number;
    taperDays: number;
    peakLongKm: number;
    pattern: string;
    quality: string;
  }
> = {
  "5k": {
    label: "5K",
    standardWeeks: 8,
    taperDays: 10,
    peakLongKm: 12,
    pattern: "Recreational 5K: mostly easy running, short pickups once a week, a modest long run.",
    quality: "After 10 easy minutes, do 6 repeats of 1 minute a little faster with a full easy jog between.",
  },
  "10k": {
    label: "10K",
    standardWeeks: 10,
    taperDays: 10,
    peakLongKm: 16,
    pattern: "Recreational 10K: easy most days, one steady effort, one longer run.",
    quality: "After 10 easy minutes, run 20 minutes comfortably hard, then jog home.",
  },
  half: {
    label: "half marathon",
    standardWeeks: 12,
    taperDays: 14,
    peakLongKm: 21,
    pattern: "Recreational half marathon: easy volume, one steady day, a weekly long run.",
    quality: "After 10 easy minutes, run 25 minutes at a steady effort you could describe in short sentences.",
  },
  marathon: {
    label: "marathon",
    standardWeeks: 18,
    taperDays: 21,
    peakLongKm: 32,
    pattern: "Recreational marathon: most kilometers easy, one steady day, a long run that grows slowly.",
    quality: "After 15 easy minutes, run 30 minutes at a relaxed marathon feel, then jog easy.",
  },
};

const DAY_MS = 86_400_000;

function utcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseDeadline(deadline: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  const parsed = new Date(`${deadline}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isTrainingGoal(value: unknown): value is TrainingGoal {
  if (!value || typeof value !== "object") return false;
  const goal = value as TrainingGoal;
  return (
    (goal.distance === "5k" ||
      goal.distance === "10k" ||
      goal.distance === "half" ||
      goal.distance === "marathon") &&
    parseDeadline(goal.deadline) != null
  );
}

function countedRuns(activities: Activity[], now: Date): Activity[] {
  const start = utcDay(now).getTime() - 28 * DAY_MS;
  return activities.filter((activity) => {
    if (activity.sport !== "running") return false;
    if (provenanceOf(activity) === "demo") return false;
    if (dispositionOf(activity) === "excluded" || dispositionOf(activity) === "pending") {
      return false;
    }
    const at = new Date(activity.startedAt).getTime();
    return at >= start && at <= now.getTime() + DAY_MS;
  });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * One session for today. Volume comes from the last 28 days of counted runs.
 * The phase comes from how many days remain against a standard recreational plan.
 */
export function suggestToday(goal: TrainingGoal, activities: Activity[], now: Date): DaySuggestion {
  const plan = PLANS[goal.distance];
  const deadline = parseDeadline(goal.deadline)!;
  const today = utcDay(now);
  const daysLeft = Math.round((deadline.getTime() - today.getTime()) / DAY_MS);
  const runs = countedRuns(activities, now);
  const weeklyKm = runs.reduce((sum, activity) => sum + activity.distanceM, 0) / 1000 / 4;
  const longest = runs.reduce((best, activity) => Math.max(best, activity.distanceM), 0) / 1000;
  const distances = runs.map((activity) => activity.distanceM / 1000);
  const typical = median(distances.filter((km) => km < longest || runs.length < 2));
  const todayRun = runs.find((activity) => activity.startedAt.slice(0, 10) === today.toISOString().slice(0, 10));
  const yesterdayKey = new Date(today.getTime() - DAY_MS).toISOString().slice(0, 10);
  const yesterday = runs.filter((activity) => activity.startedAt.slice(0, 10) === yesterdayKey);
  const yesterdayKm = yesterday.reduce((sum, activity) => sum + activity.distanceM, 0) / 1000;
  const yesterdayMin = yesterday.reduce((sum, activity) => sum + activity.movingSec, 0) / 60;
  const runsLast7 = runs.filter(
    (activity) => new Date(activity.startedAt).getTime() >= today.getTime() - 6 * DAY_MS,
  ).length;

  const history = runs.length
    ? `Last 4 weeks averaged ${round1(weeklyKm)} km per week. Longest run ${round1(longest)} km.`
    : "No counted runs in the last 4 weeks, so today stays short.";

  if (daysLeft < 0) {
    return {
      kind: "rest",
      phase: "past",
      title: "Set a new date",
      detail: "That goal day has passed. Pick the next race or target day.",
      minutes: null,
      distanceKm: null,
      reason: history,
      pattern: plan.pattern,
    };
  }

  if (todayRun) {
    const km = round1(todayRun.distanceM / 1000);
    return {
      kind: "rest",
      phase: daysLeft <= plan.taperDays ? "taper" : "build",
      title: "Already covered",
      detail: `You already recorded ${km} km today. Nothing else is required.`,
      minutes: null,
      distanceKm: null,
      reason: `${history} ${daysLeft} days remain until the ${plan.label}.`,
      pattern: plan.pattern,
    };
  }

  if (daysLeft === 0) {
    return {
      kind: "race",
      phase: "taper",
      title: `${plan.label} day`,
      detail: "Warm up with 10 easy minutes and a few short pickups, then run the race. Stop when it is done.",
      minutes: 15,
      distanceKm: null,
      reason: `${history} The target day is today.`,
      pattern: plan.pattern,
    };
  }

  const phase: PlanPhase =
    daysLeft <= plan.taperDays
      ? "taper"
      : daysLeft > plan.standardWeeks * 7
        ? "base"
        : daysLeft <= plan.standardWeeks * 2
          ? "peak"
          : "build";

  const longWeekday = modalWeekday(runs) ?? 0;
  const qualityWeekday = longWeekday === 2 ? 4 : 2;
  const weekday = today.getUTCDay();
  const yesterdayHard =
    yesterdayKm >= Math.max(8, longest * 0.75) || yesterdayMin >= 70;
  const stepLong = longest > 0 ? Math.min(plan.peakLongKm, longest * 1.1) : Math.min(8, plan.peakLongKm);
  const easyKm = runs.length
    ? Math.min(14, Math.max(3, typical > 0 ? typical : weeklyKm / 3))
    : goal.distance === "marathon"
      ? 5
      : 4;
  const taperScale = phase === "taper" ? 0.6 : 1;

  if (phase !== "taper" && (yesterdayHard || runsLast7 >= 5) && weekday !== longWeekday) {
    return {
      kind: "rest",
      phase,
      title: "Rest",
      detail: "No running today. A walk is fine. The next easy run can wait until tomorrow.",
      minutes: null,
      distanceKm: null,
      reason: `${history} ${yesterdayHard ? `Yesterday was ${round1(yesterdayKm)} km.` : `${runsLast7} runs in the last 7 days.`} ${daysLeft} days remain.`,
      pattern: plan.pattern,
    };
  }

  if (weekday === longWeekday && phase !== "taper") {
    const km = round1(Math.max(easyKm, stepLong) * taperScale);
    return {
      kind: "long",
      phase,
      title: `Long ${km} km`,
      detail: "Keep it conversational the whole way. This is one step from your recent long run, not the plan's peak.",
      minutes: Math.round(km * 6.5),
      distanceKm: km,
      reason: `${history} ${daysLeft} days remain, ${phase} phase. Today matches the weekday of your longer runs.`,
      pattern: plan.pattern,
    };
  }

  if ((phase === "build" || phase === "peak") && weekday === qualityWeekday) {
    return {
      kind: "quality",
      phase,
      title: goal.distance === "5k" ? "Short pickups" : "Steady effort",
      detail: plan.quality,
      minutes: goal.distance === "5k" ? 35 : 45,
      distanceKm: round1(Math.max(5, easyKm)),
      reason: `${history} ${daysLeft} days remain, ${phase} phase. One harder day this week is enough.`,
      pattern: plan.pattern,
    };
  }

  const km = round1(Math.max(3, easyKm * taperScale));
  return {
    kind: "easy",
    phase,
    title: phase === "taper" ? `Short ${km} km` : `Easy ${km} km`,
    detail:
      phase === "taper"
        ? "Shorter than a normal week. Stay fresh for the target day."
        : "Conversational the whole way. Walk if you need to.",
    minutes: Math.round(km * (phase === "taper" ? 6.2 : 6.5)),
    distanceKm: km,
    reason: `${history} ${daysLeft} days remain, ${phase} phase.`,
    pattern: plan.pattern,
  };
}

function modalWeekday(runs: Activity[]): number | null {
  if (runs.length < 2) return null;
  const longest = [...runs].sort((a, b) => b.distanceM - a.distanceM)[0]!;
  return new Date(longest.startedAt).getUTCDay();
}

export function suggestionForState(state: CompeteState, now: Date): DaySuggestion | null {
  if (!state.trainingGoal) return null;
  return suggestToday(state.trainingGoal, state.activities, now);
}
