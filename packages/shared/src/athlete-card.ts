import { clubLifetimeTotals } from "./club-summary";
import { competeNow, formatClockTime, initialsFromName, personalRecordHistory, rankForElo, RECORD_DISTANCES, sportById, type CompeteState } from "./compete";
import { weeklyActivityStreak } from "./weekly-streak";

export interface AthleteCardModel {
  name: string;
  city: string;
  initials: string;
  avatarUrl: string | null;
  sport: string;
  score: number | null;
  rank: string | null;
  records: { label: string; value: string; date: string }[];
  overtakes: number;
  rounds: number;
  streak: number;
  streakActive: boolean;
}

/** Read-only presentation of existing authoritative scores and counted history. */
export function athleteCardModel(state: CompeteState, now = competeNow(state)): AthleteCardModel {
  const score = state.ratings.find(r => r.sport === state.primary)?.openElo ?? null;
  const definitions = state.primary === "running" || state.primary === "cycling" ? RECORD_DISTANCES[state.primary] : [];
  const best = new Map(personalRecordHistory(state, now).filter(r => r.sport === state.primary).map(r => [r.distanceId, r]));
  const records = definitions.flatMap(d => {
    const record = best.get(d.id);
    return record ? [{ label: d.label, value: formatClockTime(record.seconds), date: record.startedAt }] : [];
  });
  const streak = weeklyActivityStreak(state.activities, now);
  return {
    name: state.name, city: state.city, initials: initialsFromName(state.name), avatarUrl: state.avatarUrl ?? null,
    sport: sportById(state.primary).name, score, rank: score === null ? null : rankForElo(score).name,
    records, overtakes: state.lifetimeOvertakes, rounds: clubLifetimeTotals(state, now).weeks,
    streak: streak.count, streakActive: streak.active,
  };
}

export function parseAthleteCardMessage(value: unknown): { model: AthleteCardModel; active: boolean; appearance: "light" | "dark" } | null {
  if (!value || typeof value !== "object") return null;
  const message = value as { type?: unknown; model?: Partial<AthleteCardModel>; active?: unknown; appearance?: unknown };
  const m = message.model;
  if (message.type !== "athlete-card" || typeof message.active !== "boolean" || !m ||
    !(message.appearance === undefined || message.appearance === "light" || message.appearance === "dark") ||
    ![m.name, m.city, m.initials, m.sport].every(s => typeof s === "string") ||
    !(m.avatarUrl === null || typeof m.avatarUrl === "string") ||
    !(m.score === null || (typeof m.score === "number" && Number.isFinite(m.score))) ||
    !(m.rank === null || typeof m.rank === "string") || typeof m.streakActive !== "boolean" ||
    ![m.overtakes, m.rounds, m.streak].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0) ||
    !Array.isArray(m.records) || m.records.length > 4 || !m.records.every(r => r &&
      typeof r.label === "string" && typeof r.value === "string" && typeof r.date === "string")) return null;
  return { model: m as AthleteCardModel, active: message.active, appearance: message.appearance === "dark" ? "dark" : "light" };
}
