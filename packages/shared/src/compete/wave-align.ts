import { waveWindowAt } from "../matching/waves";
import type { WaveEnrollment } from "../matching/types";
import {
  isPeriodResultPending,
  pendingRevealIdsFromResults,
  periodResultId,
} from "./history";
import type { CompeteState, PeriodResult } from "./sports";

function canonicalWaveBounds(waveStart: string, weekEnd: string) {
  const window = waveWindowAt(
    enrollmentWaveMidpoint({ waveStart, weekEnd }),
  );
  return {
    waveStart: window.waveStart.toISOString(),
    weekEnd: window.weekEnd.toISOString(),
  };
}

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
  const { waveStart, weekEnd } = canonicalWaveBounds(
    enrollment.waveStart,
    enrollment.weekEnd,
  );
  if (enrollment.waveStart === waveStart && enrollment.weekEnd === weekEnd) {
    return enrollment;
  }
  return { ...enrollment, waveStart, weekEnd };
}

export function normalizePeriodResult(row: PeriodResult): PeriodResult {
  const { waveStart: periodStart, weekEnd: periodEnd } = canonicalWaveBounds(
    row.periodStart,
    row.periodEnd,
  );
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

function sortPeriodResults(results: PeriodResult[]): PeriodResult[] {
  return [...results].sort(
    (a, b) =>
      b.periodStart.localeCompare(a.periodStart) ||
      a.sport.localeCompare(b.sport) ||
      a.track.localeCompare(b.track),
  );
}

export function dedupePeriodResults(results: PeriodResult[]): PeriodResult[] {
  if (results.length === 0) return results;
  const byId = new Map<string, PeriodResult>();
  let changed = false;
  for (const row of results) {
    const normalized = normalizePeriodResult(row);
    if (normalized !== row) changed = true;
    const existing = byId.get(normalized.id);
    if (!existing) {
      byId.set(normalized.id, normalized);
      continue;
    }
    changed = true;
    const existingAt = existing.settledAt ?? "";
    const rowAt = normalized.settledAt ?? "";
    if (rowAt > existingAt) {
      byId.set(normalized.id, normalized);
      continue;
    }
    if (rowAt < existingAt) continue;
    if (isPeriodResultPending(normalized) && !isPeriodResultPending(existing)) {
      byId.set(normalized.id, normalized);
    }
  }
  if (!changed) return results;
  return sortPeriodResults([...byId.values()]);
}

/**
 * Drop week-complete reveals that fired on a misaligned close while the
 * athlete is still seated in the same Eastern week.
 */
export function reconcileStalePeriodReveals(
  state: CompeteState,
  now: Date,
): PeriodResult[] {
  let changed = false;
  const next = state.periodResults.map((row) => {
    const canonical = normalizePeriodResult(row);
    if (!isPeriodResultPending(canonical)) {
      if (canonical !== row) changed = true;
      return canonical;
    }
    const enrollment = state.enrollments.find(
      (item) => item.sport === canonical.sport,
    );
    if (!enrollment) {
      if (canonical !== row) changed = true;
      return canonical;
    }
    const seat = canonicalWaveEnrollment(enrollment);
    if (
      canonical.periodStart === seat.waveStart &&
      now.getTime() < new Date(seat.weekEnd).getTime()
    ) {
      changed = true;
      return {
        ...canonical,
        acknowledgedAt: canonical.settledAt ?? now.toISOString(),
      };
    }
    if (canonical !== row) changed = true;
    return canonical;
  });
  return changed ? next : state.periodResults;
}

function alignCrewBoardPin(state: CompeteState): CompeteState["crewBoard"] {
  const pin = state.crewBoard;
  if (!pin) return null;
  const { waveStart, weekEnd } = canonicalWaveBounds(pin.waveStart, pin.weekEnd);
  if (pin.waveStart === waveStart && pin.weekEnd === weekEnd) return pin;
  return { ...pin, waveStart, weekEnd };
}

function sameStringArray(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
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
    const waveStart = waveWindowAt(new Date(rating.lockPeriod)).waveStart.toISOString();
    return rating.lockPeriod === waveStart
      ? rating
      : { ...rating, lockPeriod: waveStart };
  });
  const crewBoard = alignCrewBoardPin(state);
  let periodResults = dedupePeriodResults(state.periodResults);
  periodResults = reconcileStalePeriodReveals(
    { ...state, enrollments, periodResults },
    now,
  );
  const pendingRevealIds = pendingRevealIdsFromResults(periodResults);

  if (
    enrollments.every((row, index) => row === state.enrollments[index]) &&
    ratings.every((row, index) => row === state.ratings[index]) &&
    crewBoard === state.crewBoard &&
    periodResults === state.periodResults &&
    sameStringArray(frozenPeriods, state.frozenPeriods ?? []) &&
    sameStringArray(pendingRevealIds, state.pendingRevealIds)
  ) {
    return state;
  }

  return {
    ...state,
    enrollments,
    frozenPeriods,
    ratings,
    crewBoard,
    periodResults,
    pendingRevealIds,
  };
}
