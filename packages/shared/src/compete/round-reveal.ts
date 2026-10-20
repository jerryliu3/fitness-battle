import { competeNow } from "./engine";
import { pendingPeriodResults } from "./history";
import type { CompeteState, PeriodResult } from "./sports";

/** One round, all pending tracks acknowledged together, Open preferred for display. */
export function roundReveal(state: CompeteState) {
  const pending = pendingPeriodResults(state.periodResults);
  const latest = pending[0];
  if (!latest) return null;
  const round = pending.filter((row) => row.periodStart === latest.periodStart && row.periodEnd === latest.periodEnd);
  const results = round.filter((row) => row.track === "open" || !round.some((other) => other.sport === row.sport && other.track === "open"));
  return { key: `${latest.periodStart}:${latest.periodEnd}`, results, ids: round.map((row) => row.id) };
}

/** Describe the actual current enrollment, never infer renewal from an archived result. */
export function roundEnrollment(state: CompeteState, result: PeriodResult) {
  const enrollment = state.enrollments.find((row) => row.sport === result.sport);
  if (!enrollment) return { status: "inactive" as const, startsAt: null, renews: false };
  const startsAt = new Date(enrollment.waveStart);
  return { status: startsAt > competeNow(state) ? "upcoming" as const : "active" as const, startsAt, renews: enrollment.autoEnrollNext };
}
