import { APP_TIMEZONE } from "../period";
import type { CompeteState, SportId } from "./sports";
import { nextDailyWaveWindowAt, weekEndAfter } from "../matching/waves";
import { DEFAULT_GROUP_CAPACITY } from "../matching/types";

/** How often an open Compete field asks the server for shared scores. */
export const FIELD_REFRESH_MS = 60_000;

export function waveTimeLabel(value: string | Date): string {
  return `${new Date(value).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE })} ET`;
}

/** Queue status is derived from the benchmark; no competing status column or clock. */
export function competitionQueue(state: CompeteState, event: SportId | "sleep", now = new Date()) {
  const enrollment = state.enrollments.find(item => item.sport === event);
  const health = event === "sleep" ? state.healthRatings.find(item => item.metric === "sleep" && item.optedIn) : undefined;
  const start = enrollment?.waveStart ?? health?.lockPeriod;
  if (!start) return null;
  const end = enrollment?.weekEnd ?? weekEndAfter(new Date(start)).toISOString();
  const queued = Date.parse(start) > now.getTime();
  return { queued, awaitingField: Boolean(enrollment?.awaitingField), start, end,
    mysteryCount: (enrollment?.capacity ?? 8) - 1,
    startsLabel: waveTimeLabel(start), endsLabel: waveTimeLabel(new Date(Date.parse(end) - 60_000)) };
}

/** The server rebases unsaved new registrations when a device crosses a daily cutoff. */
export function normalizeNewRegistrations(incoming: CompeteState, stored: CompeteState | null, now: Date): CompeteState {
  const window = nextDailyWaveWindowAt(now);
  const waveStart = window.waveStart.toISOString(), weekEnd = window.weekEnd.toISOString();
  let changed = false;
  const enrollments = incoming.enrollments.map(item => {
    const old = stored?.enrollments.find(row => row.sport === item.sport);
    if (old && (old.waveStart === item.waveStart || old.autoEnrollNext && Date.parse(old.weekEnd) <= now.getTime())) {
      if (item.capacity === old.capacity) return item;
      changed = true;
      return { ...item, capacity: old.capacity };
    }
    changed = changed || item.waveStart !== waveStart || item.weekEnd !== weekEnd || item.capacity !== DEFAULT_GROUP_CAPACITY;
    return { ...item, waveStart, weekEnd, capacity: DEFAULT_GROUP_CAPACITY, fieldId: null, fieldBoard: undefined, peerIds: [], syntheticIds: [] };
  });
  const healthRatings = incoming.healthRatings.map(item => {
    const old = stored?.healthRatings.find(row => row.metric === item.metric);
    if (!item.optedIn || old?.optedIn) return item;
    changed = changed || item.lockPeriod !== waveStart;
    return { ...item, lockPeriod: waveStart };
  });
  if (!changed) return incoming;
  return { ...incoming, enrollments, healthRatings, crewBoard: null,
    clock: { ...incoming.clock, periodStart: enrollments.find(row => row.sport === incoming.primary)?.waveStart ?? incoming.clock.periodStart },
    ratings: incoming.ratings.map(item => {
      const enrollment = enrollments.find(row => row.sport === item.sport);
      return enrollment ? { ...item, lockPeriod: enrollment.waveStart } : item;
    }) };
}

export interface RenewalView {
  enrolled: boolean;
  /** When false, the current period finishes and the next one does not start. */
  renews: boolean;
  /** Exclusive close of the open period, when there is one. */
  weekEnd: string | null;
  detail: string;
}

export function sportRenewal(state: CompeteState, sport: SportId): RenewalView {
  const enrollment = state.enrollments.find((item) => item.sport === sport);
  if (!enrollment) {
    return {
      enrolled: false,
      renews: false,
      weekEnd: null,
      detail: "You're not in this week's field.",
    };
  }
  const close = waveTimeLabel(new Date(Date.parse(enrollment.weekEnd) - 60_000));
  if (enrollment.autoEnrollNext) {
    return {
      enrolled: true,
      renews: true,
      weekEnd: enrollment.weekEnd,
      detail: `This wave ends ${close}. Your next wave starts Monday at 6:00 AM ET.`,
    };
  }
  return {
    enrolled: true,
    renews: false,
    weekEnd: enrollment.weekEnd,
    detail: `This wave ends ${close}. You won't be registered after that.`,
  };
}

export function sleepRenewal(state: CompeteState): RenewalView {
  const rating = state.healthRatings.find((item) => item.metric === "sleep");
  if (!rating?.optedIn) {
    return {
      enrolled: false,
      renews: false,
      weekEnd: null,
      detail: "Sleep isn't in this week's contest.",
    };
  }
  const weekEnd = weekEndAfter(new Date(rating.lockPeriod)).toISOString();
  const close = waveTimeLabel(new Date(Date.parse(weekEnd) - 60_000));
  if (rating.autoEnrollNext) {
    return {
      enrolled: true,
      renews: true,
      weekEnd,
      detail: `This sleep wave ends ${close}. Your next wave starts Monday at 6:00 AM ET.`,
    };
  }
  return {
    enrolled: true,
    renews: false,
    weekEnd,
    detail: `This sleep wave ends ${close}. It won't renew after that.`,
  };
}

/**
 * True when a save would drop a period that has not reached its close.
 * Scheduling `autoEnrollNext` is allowed. Immediate opt-out is not.
 */
export function openEnrollmentRemoved(
  stored: CompeteState,
  incoming: CompeteState,
  now: Date,
): boolean {
  const instant = now.toISOString();
  for (const enrollment of stored.enrollments) {
    if (enrollment.weekEnd <= instant || enrollment.waveStart > instant) continue;
    const next = incoming.enrollments.find((item) => item.sport === enrollment.sport);
    if (
      !next ||
      next.waveStart !== enrollment.waveStart ||
      next.weekEnd !== enrollment.weekEnd
    ) {
      return true;
    }
  }
  const sleep = stored.healthRatings.find((item) => item.metric === "sleep");
  if (sleep?.optedIn) {
    const end = weekEndAfter(new Date(sleep.lockPeriod)).toISOString();
    if (end > instant && sleep.lockPeriod <= instant) {
      const next = incoming.healthRatings.find((item) => item.metric === "sleep");
      if (!next?.optedIn || next.lockPeriod !== sleep.lockPeriod) return true;
    }
  }
  return false;
}
