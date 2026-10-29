import { pickSynthetics, settleSportRound, weeklyPeriodBounds, weeklyWaveWindowAt, type CompeteState, type CrewBoardPin } from "@fitness-battle/shared";
import type { WeekFieldRow } from "./week-field";

export interface AdminWaveAccount { userId: string; updatedAt: string; state: CompeteState }

/** Admin-only orchestration: close a selected field and prepare its replacement. No writes. */
export function planAdminFieldWave(field: WeekFieldRow, accounts: AdminWaveAccount[], boards: (CrewBoardPin | undefined)[], now: Date, startNow: boolean) {
  if (Date.parse(field.wave_start) >= now.getTime() || Date.parse(field.week_end) <= now.getTime()) throw new Error("field_not_active");
  const nowIso = now.toISOString();
  const monday = weeklyPeriodBounds(now).endsAt;
  const startsAt = startNow ? now : weeklyWaveWindowAt(monday).waveStart;
  const endsAt = weeklyPeriodBounds(startsAt).endsAt;
  const matches = (row: CompeteState["enrollments"][number]) => row.sport === field.sport && Date.parse(row.waveStart) === Date.parse(field.wave_start) && Date.parse(row.weekEnd) === Date.parse(field.week_end);
  const renewing = accounts.filter((account) => account.state.enrollments.some((row) => matches(row) && row.autoEnrollNext));
  const memberIds = renewing.map((account) => account.userId);
  const syntheticIds = pickSynthetics(field.sport, 1000, Math.max(0, field.capacity - memberIds.length), memberIds, `admin-wave:${field.id}:${nowIso}`).map((row) => row.id);
  const snapshots = accounts.map((account, index) => {
    const enrollment = account.state.enrollments.find(matches);
    if (!enrollment) return { ...account, before: account.state, after: account.state, actionId: crypto.randomUUID() };
    const board = boards[index];
    if (!board || board.sport !== field.sport || Date.parse(board.waveStart) !== Date.parse(field.wave_start)) throw new Error("field_roster_unavailable");
    const closing = { ...account.state, demoNow: null, crewBoard: { ...board, weekEnd: nowIso },
      enrollments: account.state.enrollments.map((row) => matches(row) ? { ...row, weekEnd: nowIso, fieldBoard: { ...board, weekEnd: nowIso }, awaitingField: false } : row) };
    let after = settleSportRound(closing, field.sport, now);
    if (enrollment.autoEnrollNext) {
      after = { ...after, enrollments: after.enrollments.map((row) => row.sport === field.sport ? {
        ...row, waveStart: startsAt.toISOString(), weekEnd: endsAt.toISOString(), capacity: field.capacity,
        peerIds: memberIds.filter((id) => id !== account.userId), syntheticIds, crewId: field.crew_id ?? undefined,
      } : row), ratings: after.ratings.map((row) => row.sport === field.sport ? { ...row, lockPeriod: startsAt.toISOString(), lockOpen: row.openElo, lockVerified: row.verifiedElo } : row),
      clock: { ...after.clock, periodStart: startsAt.toISOString() } };
    }
    return { ...account, before: account.state, after: { ...after, crewBoard: null }, actionId: crypto.randomUUID() };
  });
  return { snapshots, nextField: { ...field, id: crypto.randomUUID(), wave_start: startsAt.toISOString(), week_end: endsAt.toISOString(), member_ids: memberIds, synthetic_ids: syntheticIds } };
}
