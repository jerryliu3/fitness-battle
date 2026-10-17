import { dispositionOf, provenanceOf } from "./ledger";
import type { Activity, CompeteState, GoalDistance, SportId, TrainingGoal } from "./sports";

/** Recreational race targets. The shapes follow common public plans, not a copied workout table. */
export type { GoalDistance, TrainingGoal } from "./sports";

export type SuggestionKind = "rest" | "easy" | "long" | "quality" | "race";
export type PlanPhase = "open" | "base" | "build" | "peak" | "taper" | "past";

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
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.toISOString().slice(0, 10) !== deadline) return null;
  return parsed;
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

function countedSince(
  activities: Activity[],
  now: Date,
  days: number,
  sport: SportId | null,
): Activity[] {
  const start = utcDay(now).getTime() - days * DAY_MS;
  return activities.filter((activity) => {
    if (sport && activity.sport !== sport) return false;
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

const OPEN_PATTERN =
  "No race date. Today follows the length of your recent counted sessions.";

function round5(minutes: number): number {
  return Math.max(20, Math.min(50, Math.round(minutes / 5) * 5));
}

/**
 * One session when the athlete has not set a race or target day.
 * Length follows counted sessions from the last 7 days, or 30 easy minutes.
 */
export function suggestOpen(
  activities: Activity[],
  now: Date,
  primary: SportId = "running",
): DaySuggestion {
  const today = utcDay(now);
  const todayKey = today.toISOString().slice(0, 10);
  const recent = countedSince(activities, now, 7, null);
  const todaySession = recent.find((activity) => activity.startedAt.slice(0, 10) === todayKey);
  const yesterdayKey = new Date(today.getTime() - DAY_MS).toISOString().slice(0, 10);
  const yesterday = recent.filter((activity) => activity.startedAt.slice(0, 10) === yesterdayKey);
  const yesterdayMin = yesterday.reduce((sum, activity) => sum + activity.movingSec, 0) / 60;
  const yesterdayKm =
    yesterday
      .filter((activity) => activity.sport === primary)
      .reduce((sum, activity) => sum + activity.distanceM, 0) / 1000;
  const prior = recent.filter((activity) => activity.startedAt.slice(0, 10) !== todayKey);
  const history = prior.length
    ? `${prior.length} counted session${prior.length === 1 ? "" : "s"} in the last 7 days.`
    : "No counted sessions in the last 7 days.";

  if (todaySession) {
    const minutes = Math.round(todaySession.movingSec / 60);
    return {
      kind: "rest",
      phase: "open",
      title: "Already covered",
      detail: `You already recorded ${minutes} minutes today. Nothing else is required.`,
      minutes: null,
      distanceKm: null,
      reason: history,
      pattern: OPEN_PATTERN,
    };
  }

  const thresholdKm = primary === "cycling" ? 20 : 8;
  if (yesterdayMin >= 70 || yesterdayKm >= thresholdKm || prior.length >= 5) {
    return {
      kind: "rest",
      phase: "open",
      title: "Rest",
      detail: primary === "cycling" ? "No extra ride today. An easy spin or walk is fine." : "No extra session today. A walk is fine.",
      minutes: null,
      distanceKm: null,
      reason: `${history} ${
        yesterdayMin >= 70 || yesterdayKm >= thresholdKm
          ? "Yesterday was already a full session."
          : "Five sessions in the last 7 days is enough."
      }`,
      pattern: OPEN_PATTERN,
    };
  }

  const typicalMin = median(prior.map((activity) => activity.movingSec / 60));
  const minutes = prior.length ? round5(typicalMin) : 30;
  const primarySessions = prior.filter((activity) => activity.sport === primary && activity.distanceM > 0);
  const typicalKm = median(primarySessions.map((activity) => activity.distanceM / 1000));
  const maxKm = primary === "cycling" ? 25 : 10;
  const distanceKm = primarySessions.length && typicalKm >= 1 ? round1(Math.min(maxKm, typicalKm)) : null;

  let firstSessionDetail = "Thirty easy minutes. Walk or jog, whatever you can keep comfortable.";
  if (primary === "cycling") {
    firstSessionDetail = "Thirty easy minutes on the bike. Spin easy, whatever you can keep comfortable.";
  } else if (primary === "walking") {
    firstSessionDetail = "Thirty easy minutes. Keep a comfortable walking pace.";
  } else if (primary === "strength") {
    firstSessionDetail = "Thirty easy minutes of steady bodyweight or resistance training.";
  }

  return {
    kind: "easy",
    phase: "open",
    title: distanceKm ? `Easy ${distanceKm} km` : `Easy ${minutes} min`,
    detail: prior.length
      ? "Match a normal recent session. Keep it comfortable the whole way."
      : firstSessionDetail,
    minutes,
    distanceKm,
    reason: history,
    pattern: OPEN_PATTERN,
  };
}

/**
 * One session for today. Volume comes from the last 28 days of counted runs.
 * The phase comes from how many days remain against a standard recreational plan.
 */
export function suggestToday(
  goal: TrainingGoal,
  activities: Activity[],
  now: Date,
  sport: SportId = "running",
): DaySuggestion {
  const plan = PLANS[goal.distance];
  const deadline = parseDeadline(goal.deadline);
  if (!deadline) return suggestOpen(activities, now);
  const today = utcDay(now);
  const todayKey = today.toISOString().slice(0, 10);
  const daysLeft = Math.round((deadline.getTime() - today.getTime()) / DAY_MS);
  const recent = countedSince(activities, now, 28, null);
  const sessions = recent.filter((activity) => activity.sport === sport);
  const longest = sessions.reduce((best, activity) => Math.max(best, activity.distanceM), 0) / 1000;
  const distances = sessions.map((activity) => activity.distanceM / 1000);
  const typical = median(distances.filter((km) => km < longest || sessions.length < 2));
  const todaySession = recent.find((activity) => activity.startedAt.slice(0, 10) === todayKey);
  const yesterdayKey = new Date(today.getTime() - DAY_MS).toISOString().slice(0, 10);
  const yesterday = recent.filter((activity) => activity.startedAt.slice(0, 10) === yesterdayKey);
  const yesterdayKm = yesterday
    .filter((activity) => activity.sport === sport)
    .reduce((sum, activity) => sum + activity.distanceM, 0) / 1000;
  const yesterdayMin = yesterday.reduce((sum, activity) => sum + activity.movingSec, 0) / 60;
  const sessionsLast7 = recent.filter(
    (activity) => new Date(activity.startedAt).getTime() >= today.getTime() - 6 * DAY_MS,
  ).length;

  const history = historyLine(sessions, sport);
  const longestMin = sessions.reduce((best, activity) => Math.max(best, activity.movingSec / 60), 0);

  const say = (
    kind: SuggestionKind,
    phase: PlanPhase,
    minutes: number | null,
    distanceKm: number | null,
    detail: string,
    reason: string,
    title: string,
  ): DaySuggestion => ({
    kind,
    phase,
    title,
    detail,
    minutes,
    distanceKm,
    reason,
    pattern: plan.pattern,
  });

  if (daysLeft < 0) {
    return say(
      "rest",
      "past",
      null,
      null,
      "That goal day has passed. Pick the next race or target day.",
      history,
      "Set a new date",
    );
  }

  if (todaySession) {
    const minutes = Math.round(todaySession.movingSec / 60);
    const km = todaySession.distanceM > 0 ? round1(todaySession.distanceM / 1000) : null;
    return say(
      "rest",
      daysLeft <= plan.taperDays ? "taper" : "build",
      null,
      null,
      km
        ? `You already recorded ${km} km today. Nothing else is required.`
        : `You already recorded ${minutes} minutes today. Nothing else is required.`,
      `${history} ${daysLeft} days remain until the ${plan.label}.`,
      "Already covered",
    );
  }

  if (daysLeft === 0) {
    return say(
      "race",
      "taper",
      15,
      null,
      "Warm up with 10 easy minutes and a few short pickups, then run the race. Stop when it is done.",
      `${history} The target day is today.`,
      `${plan.label} day`,
    );
  }

  const phase: PlanPhase =
    daysLeft <= plan.taperDays
      ? "taper"
      : daysLeft > plan.standardWeeks * 7
        ? "base"
        : daysLeft <= plan.standardWeeks * 2
          ? "peak"
          : "build";

  const reason = `${history} ${daysLeft} days remain, ${phase} phase.`;
  const longWeekday = mainWeekday(sessions) ?? 0;
  const qualityWeekday = longWeekday === 2 ? 4 : 2;
  const weekday = today.getUTCDay();
  const yesterdayHard = yesterdayMin >= 70 || (longest > 0 && yesterdayKm >= Math.max(8, longest * 0.75));
  const taperScale = phase === "taper" ? 0.6 : 1;

  const fit = (minutes: number | null, distanceKm: number | null) => {
    const km = distanceKm == null ? null : longest > 0 ? round1(Math.min(distanceKm, longest * 1.1)) : round1(distanceKm);
    const nextMinutes =
      km != null
        ? Math.max(10, Math.round(km * (phase === "taper" ? 6.2 : 6.5)))
        : minutes != null && longestMin > 0
          ? Math.max(10, Math.min(minutes, Math.round(longestMin * 1.1)))
          : minutes;
    const shrunk =
      (distanceKm != null && km != null && km + 0.05 < distanceKm) ||
      (distanceKm == null && minutes != null && nextMinutes != null && nextMinutes + 0.5 < minutes);
    return { minutes: nextMinutes, distanceKm: km, shrunk };
  };

  const present = (
    kind: SuggestionKind,
    minutes: number | null,
    distanceKm: number | null,
    detail: string,
  ): DaySuggestion => {
    const fitted = fit(minutes, distanceKm);
    if (fitted.shrunk && (kind === "quality" || kind === "long")) {
      const easyDetail =
        phase === "taper"
          ? "Shorter than a normal week. Stay fresh for the target day."
          : "Conversational the whole way. Walk if you need to.";
      const title =
        fitted.distanceKm != null
          ? `${phase === "taper" ? "Short" : "Easy"} ${fitted.distanceKm} km`
          : `${phase === "taper" ? "Short" : "Easy"} ${fitted.minutes} min`;
      return say("easy", phase, fitted.minutes, fitted.distanceKm, easyDetail, reason, title);
    }
    if (kind === "quality") {
      return say(
        "quality",
        phase,
        minutes,
        distanceKm,
        detail,
        reason,
        goal.distance === "5k" ? "Short pickups" : "Steady effort",
      );
    }
    const title =
      fitted.distanceKm != null
        ? `${kind === "long" ? "Long" : phase === "taper" ? "Short" : "Easy"} ${fitted.distanceKm} km`
        : `${kind === "long" ? "Long" : phase === "taper" ? "Short" : "Easy"} ${fitted.minutes} min`;
    return say(kind, phase, fitted.minutes, fitted.distanceKm, detail, reason, title);
  };

  if (yesterdayHard || sessionsLast7 >= 5) {
    return say(
      "rest",
      phase,
      null,
      null,
      "No extra session today. A walk is fine. The next easy session can wait until tomorrow.",
      `${history} ${
        yesterdayHard
          ? yesterdayKm >= 1
            ? `Yesterday was ${round1(yesterdayKm)} km.`
            : "Yesterday was already a full session."
          : `${sessionsLast7} sessions in the last 7 days.`
      } ${daysLeft} days remain.`,
      "Rest",
    );
  }

  if (sessions.length === 0) {
    return present(
      "easy",
      30,
      null,
      "Thirty easy minutes. Walk or jog, whatever you can keep comfortable.",
    );
  }

  const useDistance = sport === "running" || longest >= 1;
  const anchor = sessions
    .filter((activity) => new Date(activity.startedAt).getUTCDay() === longWeekday)
    .reduce((best, activity) => Math.max(best, activity.distanceM), 0) / 1000;
  const grewFrom = anchor > 0 ? anchor : longest;
  const stepLong = useDistance ? Math.min(sport === "running" ? plan.peakLongKm : grewFrom * 1.1, grewFrom * 1.1) : 0;
  const easyKm =
    sport === "running"
      ? Math.min(14, Math.max(3, typical > 0 ? typical : longest / 2))
      : Math.max(1, typical > 0 ? typical : longest);
  const easyText =
    phase === "taper"
      ? "Shorter than a normal week. Stay fresh for the target day."
      : "Conversational the whole way. Walk if you need to.";

  if (weekday === longWeekday && phase !== "taper" && sessions.length >= 2) {
    if (!useDistance) {
      const minutes = Math.round(median(sessions.map((activity) => activity.movingSec / 60)) * 1.1);
      return present( "long", minutes, null, "A little longer than a normal session. Keep it comfortable the whole way.");
    }
    const km = round1(Math.max(easyKm, stepLong) * taperScale);
    return present(
      "long",
      Math.round(km * 6.5),
      km,
      "Keep it conversational the whole way. This is one step from your recent long session, not the plan's peak.",
    );
  }

  if (sport === "running" && (phase === "build" || phase === "peak") && weekday === qualityWeekday) {
    const km = round1(Math.max(5, easyKm));
    return present("quality", goal.distance === "5k" ? 35 : 45, km, plan.quality);
  }

  if (!useDistance) {
    const minutes = Math.max(20, Math.round(median(sessions.map((activity) => activity.movingSec / 60)) * taperScale));
    return present("easy", minutes, null, easyText);
  }

  const km = round1(Math.max(3, easyKm * taperScale));
  return present("easy", Math.round(km * (phase === "taper" ? 6.2 : 6.5)), km, easyText);
}

function historyLine(sessions: Activity[], sport: SportId): string {
  if (sessions.length === 0) return `No counted ${sport} sessions in the last 4 weeks.`;
  const totalKm = sessions.reduce((sum, activity) => sum + activity.distanceM, 0) / 1000;
  const longest = sessions.reduce((best, activity) => Math.max(best, activity.distanceM), 0) / 1000;
  if (totalKm >= 1) {
    return `${round1(totalKm)} km of counted ${sport} in the last 4 weeks. Longest ${round1(longest)} km.`;
  }
  const minutes = Math.round(sessions.reduce((sum, activity) => sum + activity.movingSec, 0) / 60);
  return `${minutes} minutes of counted ${sport} in the last 4 weeks.`;
}

/** Weekday where the most distance (or time, when distance is empty) actually landed. */
function mainWeekday(sessions: Activity[]): number | null {
  if (sessions.length < 2) return null;
  const totals = new Map<number, number>();
  for (const activity of sessions) {
    const day = new Date(activity.startedAt).getUTCDay();
    const weight = activity.distanceM > 0 ? activity.distanceM : activity.movingSec;
    totals.set(day, (totals.get(day) ?? 0) + weight);
  }
  let bestDay = 0;
  let best = -1;
  for (const [day, total] of totals) {
    if (total > best) {
      best = total;
      bestDay = day;
    }
  }
  return bestDay;
}

export function suggestionForState(state: CompeteState, now: Date): DaySuggestion {
  if (!state.trainingGoal || !isTrainingGoal(state.trainingGoal)) {
    return suggestOpen(state.activities, now, state.primary);
  }
  return suggestToday(state.trainingGoal, state.activities, now, state.primary);
}
