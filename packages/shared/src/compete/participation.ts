import type { CompeteState, SportId } from "./sports";
import { weekEndAfter } from "../matching/waves";

/** How often an open Compete field asks the server for shared scores. */
export const FIELD_REFRESH_MS = 60_000;

export interface RenewalView {
  enrolled: boolean;
  /** When false, the current period finishes and the next one does not start. */
  renews: boolean;
  /** Exclusive UTC close of the open period, when there is one. */
  weekEnd: string | null;
  detail: string;
}

function closeLabel(weekEnd: string): string {
  const label = new Date(weekEnd).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${label} 00:00 UTC`;
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
  const close = closeLabel(enrollment.weekEnd);
  if (enrollment.autoEnrollNext) {
    return {
      enrolled: true,
      renews: true,
      weekEnd: enrollment.weekEnd,
      detail: `This week stays open through ${close}. You'll be registered again when it closes.`,
    };
  }
  return {
    enrolled: true,
    renews: false,
    weekEnd: enrollment.weekEnd,
    detail: `This week stays open through ${close}. You won't be registered after that.`,
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
  const close = closeLabel(weekEnd);
  if (rating.autoEnrollNext) {
    return {
      enrolled: true,
      renews: true,
      weekEnd,
      detail: `This sleep week stays open through ${close}. It renews when the week closes.`,
    };
  }
  return {
    enrolled: true,
    renews: false,
    weekEnd,
    detail: `This sleep week stays open through ${close}. It won't renew after that.`,
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
    if (enrollment.weekEnd <= instant) continue;
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
    if (end > instant) {
      const next = incoming.healthRatings.find((item) => item.metric === "sleep");
      if (!next?.optedIn || next.lockPeriod !== sleep.lockPeriod) return true;
    }
  }
  return false;
}
