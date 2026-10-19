import { waveWindowAt } from "../matching/waves";
import type { WaveEnrollment } from "../matching/types";
import {
  isPeriodResultPending,
  pendingRevealIdsFromResults,
  periodResultId,
} from "./history";
import type { CompeteState, PeriodResult } from "./sports";

export function enrollmentWaveMidpoint(
  enrollment: Pick<WaveEnrollment, "waveStart" | "weekEnd">,
): Date {
  const start = new Date(enrollment.waveStart).getTime();
  const end = new Date(enrollment.weekEnd).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return new Date(start);
  }
  return new Date(start + (end - start) / 2);
}

/** Map legacy UTC-midnight windows onto America/New_York Monday weeks. */
export function canonicalWaveEnrollment<T extends WaveEnrollment>(enrollment: T): T {
  const window = waveWindowAt(enrollmentWaveMidpoint(enrollment));
  const waveStart = window.waveStart.toISOString();
  const weekEnd = window.weekEnd.toISOString();
  if (enrollment.waveStart === waveStart && enrollment.weekEnd === weekEnd) {
    return enrollment;
  }
  return { ...enrollment, waveStart, weekEnd };
}

export function normalizePeriodResult(row: PeriodResult): PeriodResult {
  const window = waveWindowAt(
    enrollmentWaveMidpoint({
      waveStart: row.periodStart,
      weekEnd: row.periodEnd,
    }),
  );
  const periodStart = window.waveStart.toISOString();
  const periodEnd = window.weekEnd.toISOString();
  const id = periodResultId(periodStart, row.sport, row.track);
  if (
    row.periodStart === periodStart &&
    row.periodEnd === periodEnd &&
    row.id === id
  ) {
    return row;
  }
  return { ...row, id, periodStart, periodEnd };
}

export function dedupePeriodResults(results: PeriodResult[]): PeriodResult[] {
  const byId = new Map<string, PeriodResult>();
  for (const row of results.map(normalizePeriodResult)) {
    const existing = byId.get(row.id);
    if (!existing) {
      byId.set(row.id, row);
      continue;
    }
    const keep =
      (existing.settledAt ?? "") >= (row.settledAt ?? "") ? existing : row;
    if (
      isPeriodResultPending(keep) &&
      !isPeriodResultPending(row) &&
      (row.settledAt ?? "") >= (keep.settledAt ?? "")
    ) {
      byId.set(row.id, row);
      continue;
    }
    if (
      !isPeriodResultPending(keep) &&
      isPeriodResultPending(row) &&
      (existing.settledAt ?? "") >= (row.settledAt ?? "")
    ) {
      continue;
    }
    byId.set(row.id, keep);
  }
  return [...byId.values()].sort(
    (a, b) =>
      b.periodStart.localeCompare(a.periodStart) ||
      a.sport.localeCompare(b.sport) ||
      a.track.localeCompare(b.track),
  );
}

/**
 * Drop week-complete reveals that fired on a misaligned close while the
 * athlete is still seated in the same Eastern week.
 */
export function reconcileStalePeriodReveals(
  state: CompeteState,
  now: Date,
): PeriodResult[] {
  return state.periodResults.map((row) => {
    if (!isPeriodResultPending(row)) return row;
    const enrollment = state.enrollments.find((item) => item.sport === row.sport);
    if (!enrollment) return normalizePeriodResult(row);
    const canonicalEnrollment = canonicalWaveEnrollment(enrollment);
    const canonical = normalizePeriodResult(row);
    if (
      canonical.periodStart === canonicalEnrollment.waveStart &&
      now.getTime() < new Date(canonicalEnrollment.weekEnd).getTime()
    ) {
      return {
        ...canonical,
        acknowledgedAt: canonical.settledAt ?? now.toISOString(),
      };
    }
    return canonical;
  });
}

export function alignCompeteWaves(
  state: CompeteState,
  now: Date = new Date(),
): CompeteState {
  const enrollments = state.enrollments.map(canonicalWaveEnrollment);
  const frozenPeriods = [
    ...new Set(
      (state.frozenPeriods ?? []).map(
        (start) => waveWindowAt(new Date(start)).waveStart.toISOString(),
      ),
    ),
  ];
  const ratings = state.ratings.map((rating) => {
    if (!rating.lockPeriod) return rating;
    const waveStart = waveWindowAt(
      enrollmentWaveMidpoint({
        waveStart: rating.lockPeriod,
        weekEnd: rating.lockPeriod,
      }),
    ).waveStart.toISOString();
    return rating.lockPeriod === waveStart ? rating : { ...rating, lockPeriod: waveStart };
  });
  const crewBoard =
    state.crewBoard == null
      ? null
      : (() => {
          const aligned = canonicalWaveEnrollment({
            sport: state.crewBoard.sport,
            waveStart: state.crewBoard.waveStart,
            weekEnd: state.crewBoard.weekEnd,
            capacity: state.crewBoard.capacity,
            peerIds: [],
            syntheticIds: state.crewBoard.syntheticIds,
            autoEnrollNext: true,
          });
          if (
            aligned.waveStart === state.crewBoard.waveStart &&
            aligned.weekEnd === state.crewBoard.weekEnd
          ) {
            return state.crewBoard;
          }
          return {
            ...state.crewBoard,
            waveStart: aligned.waveStart,
            weekEnd: aligned.weekEnd,
          };
        })();

  let periodResults = dedupePeriodResults(state.periodResults);
  const next: CompeteState = {
    ...state,
    enrollments,
    frozenPeriods,
    ratings,
    crewBoard,
    periodResults,
  };
  periodResults = reconcileStalePeriodReveals(
    { ...next, periodResults },
    now,
  );
  const pendingRevealIds = pendingRevealIdsFromResults(periodResults);
  return { ...next, periodResults, pendingRevealIds };
}
