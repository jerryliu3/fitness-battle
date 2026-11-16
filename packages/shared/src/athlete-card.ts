import { readAccountEffort } from './compete/effort-account';
import { RANK_NAMES } from './compete/effort-score';
import { athleteLocationLine } from "./countries";
import { clubAchievements, clubDuration, clubLifetimeTotals, clubWeekSummary } from "./club-summary";
import {
  competeNow,
  countsOnTrack,
  distanceUnitLabel,
  formatClockTime,
  formatDistanceM,
  initialsFromName,
  personalRecordHistory,
  rankForElo,
  RECORD_DISTANCES,
  sportById,
  type CompeteState,
} from "./compete";
import { accountTimeZone } from "./timezone";
import { weeklyPeriodBounds } from "./period";
import { weeklyActivityStreak } from "./weekly-streak";

export const ATHLETE_CARD_HIGHLIGHT_LIMIT = 3;

export type AthleteCardHighlightKind = "record" | "achievement" | "stat";

export interface AthleteCardHighlightItem {
  id?: string;
  kind?: AthleteCardHighlightKind;
  label: string;
  value: string;
  date: string;
}

export interface AthleteCardHighlightOption extends AthleteCardHighlightItem {
  id: string;
  kind: AthleteCardHighlightKind;
  title: string;
  detail: string;
}

export interface AthleteCardModel {
  name: string;
  city: string;
  location: string;
  countryCode: string | null;
  /** IANA zone for formatting record dates on the card (from profile). */
  displayTimeZone?: string;
  initials: string;
  avatarUrl: string | null;
  sport: string;
  score: number | null;
  rank: string | null;
  records: AthleteCardHighlightItem[];
  overtakes: number;
  rounds: number;
  streak: number;
  streakActive: boolean;
}

export function defaultAthleteCardHighlights(
  state: CompeteState,
  now = competeNow(state),
): AthleteCardHighlightItem[] {
  const definitions =
    state.primary === "running" || state.primary === "cycling"
      ? RECORD_DISTANCES[state.primary]
      : [];
  const best = new Map(
    personalRecordHistory(state, now)
      .filter((r) => r.sport === state.primary)
      .map((r) => [r.distanceId, r]),
  );
  return definitions.flatMap((d) => {
    const record = best.get(d.id);
    return record
      ? [{ label: d.label, value: formatClockTime(record.seconds), date: record.startedAt }]
      : [];
  });
}

/** Default Row-1 highlight IDs shown in the Athlete Card customizer before any edit. */
export function defaultAthleteCardHighlightIds(
  state: CompeteState,
  now = competeNow(state),
): string[] {
  const definitions =
    state.primary === "running" || state.primary === "cycling"
      ? RECORD_DISTANCES[state.primary]
      : [];
  const earned = new Set(
    personalRecordHistory(state, now)
      .filter((r) => r.sport === state.primary)
      .map((r) => r.distanceId),
  );
  return definitions
    .filter((d) => earned.has(d.id))
    .slice(0, ATHLETE_CARD_HIGHLIGHT_LIMIT)
    .map((d) => `pb:${state.primary}:${d.id}`);
}

/** Pickable PBs, earned achievements, and statistics for Row 1 of the Athlete Card. */
export function athleteCardHighlightCatalog(
  state: CompeteState,
  now = competeNow(state),
): AthleteCardHighlightOption[] {
  const options: AthleteCardHighlightOption[] = [];

  for (const record of personalRecordHistory(state, now)) {
    const sportName = sportById(record.sport).name;
    const distanceLabel =
      RECORD_DISTANCES[record.sport].find((d) => d.id === record.distanceId)?.label ??
      record.distanceId.toUpperCase();
    options.push({
      id: `pb:${record.sport}:${record.distanceId}`,
      kind: "record",
      title: `${sportName} ${distanceLabel}`,
      label: distanceLabel,
      value: formatClockTime(record.seconds),
      date: record.startedAt,
      detail: `${sportName} personal best`,
    });
  }

  for (const ach of clubAchievements(state, now)) {
    if (!ach.earned) continue;
    options.push({
      id: `ach:${ach.id}`,
      kind: "achievement",
      title: ach.title,
      label:
        ach.category === "sessions"
          ? ach.target === 1
            ? "1st session"
            : `${ach.target}+ sessions`
          : `${ach.target.toLocaleString()}+ rating`,
      value: ach.category === "sessions" ? `${ach.target}+` : `${ach.target} pts`,
      date: "",
      detail:
        ach.category === "sessions"
          ? `${ach.target}+ counted sessions milestone`
          : `Reached ${ach.target} effort score`,
    });
  }

  const counted = state.activities.filter(
    (a) =>
      countsOnTrack(a, "open") &&
      Number.isFinite(Date.parse(a.startedAt)) &&
      Date.parse(a.startedAt) <= now.getTime(),
  );
  const totals = clubLifetimeTotals(state, now);
  const week = clubWeekSummary(state, now);
  const weekBounds = weeklyPeriodBounds(now);
  const weekMeters = counted
    .filter((a) => {
      const at = Date.parse(a.startedAt);
      return at >= weekBounds.startsAt.getTime() && at < weekBounds.endsAt.getTime();
    })
    .reduce((n, a) => n + Math.max(0, a.distanceM), 0);
  const unit = distanceUnitLabel(state.units);
  const totalMovingSec = counted.reduce((n, a) => n + Math.max(0, a.movingSec), 0);
  const primaryScore = readAccountEffort(state,state.primary,now)?.liveScore ?? state.ratings.find((r) => r.sport === state.primary)?.openElo ?? null;
  const completedResults = state.periodResults.filter(
    (r) => r.track === "open" && Date.parse(r.periodEnd) <= now.getTime(),
  );
  const wins = completedResults.filter((r) => r.place === 1).length;
  const podiums = completedResults.filter((r) => r.place <= 3).length;

  options.push(
    {
      id: "stat:sessions",
      kind: "stat",
      title: "Sessions",
      label: "Sessions",
      value: String(totals.sessions),
      date: "",
      detail: "Counted lifetime activities",
    },
    {
      id: "stat:distance",
      kind: "stat",
      title: "Lifetime distance",
      label: "Lifetime",
      value: `${formatDistanceM(totals.meters, state.units)} ${unit}`,
      date: "",
      detail: "Total counted distance",
    },
    {
      id: "stat:time",
      kind: "stat",
      title: "Moving time",
      label: "Moving time",
      value: clubDuration(totalMovingSec),
      date: "",
      detail: "Total counted duration",
    },
    {
      id: "stat:week-distance",
      kind: "stat",
      title: "This week",
      label: "This week",
      value: `${formatDistanceM(weekMeters, state.units)} ${unit}`,
      date: "",
      detail: `${week.sessions} session${week.sessions === 1 ? "" : "s"} this week`,
    },
    {
      id: "stat:score",
      kind: "stat",
      title: `${sportById(state.primary).name} rating`,
      label: `${sportById(state.primary).name} Elo`,
      value: primaryScore === null ? "—" : String(primaryScore),
      date: "",
      detail: primaryScore === null ? "Primary rating" : rankForElo(primaryScore).name,
    },
    {
      id: "stat:wins",
      kind: "stat",
      title: "Field wins",
      label: "Field wins",
      value: String(wins),
      date: "",
      detail: "1st-place battle finishes",
    },
    {
      id: "stat:podiums",
      kind: "stat",
      title: "Podium finishes",
      label: "Podiums",
      value: String(podiums),
      date: "",
      detail: "Top-3 battle finishes",
    },
  );

  return options;
}

/** Read-only presentation of existing authoritative scores and counted history. */
export function athleteCardModelForPeer(input: {
  name: string;
  city?: string | null;
  avatarUrl?: string | null;
  score?: number | null;
  sport?: string | null;
}): AthleteCardModel {
  const score = input.score ?? null;
  const countryCode = null;
  return {
    name: input.name,
    city: input.city?.trim() || "—",
    location: athleteLocationLine(input.city, countryCode),
    countryCode,
    initials: initialsFromName(input.name),
    avatarUrl: input.avatarUrl ?? null,
    sport: input.sport?.trim() || "Athlete",
    score,
    rank: score === null ? null : rankForElo(score).name,
    records: [],
    overtakes: 0,
    rounds: 0,
    streak: 0,
    streakActive: false,
  };
}

export function athleteCardModel(state: CompeteState, now = competeNow(state)): AthleteCardModel {
  const score = readAccountEffort(state,state.primary,now)?.liveScore ?? state.ratings.find(r => r.sport === state.primary)?.openElo ?? null;
  const records: AthleteCardHighlightItem[] = Array.isArray(state.cardHighlights)
    ? (() => {
        const byId = new Map(athleteCardHighlightCatalog(state, now).map(item => [item.id, item]));
        return state.cardHighlights
          .slice(0, ATHLETE_CARD_HIGHLIGHT_LIMIT)
          .flatMap(id => {
            const item = byId.get(id);
            return item ? [{ id: item.id, kind: item.kind, label: item.label, value: item.value, date: item.date }] : [];
          });
      })()
    : defaultAthleteCardHighlights(state, now);
  const streak = weeklyActivityStreak(state.activities, now, state.dailyHealth);
  const countryCode = state.countryCode ?? null;
  return {
    name: state.name,
    city: state.city,
    location: athleteLocationLine(state.city, countryCode),
    countryCode,
    initials: initialsFromName(state.name),
    avatarUrl: state.avatarUrl ?? null,
    sport: sportById(state.primary).name, score, rank: state.effortAccounts?.[state.primary] ? RANK_NAMES[state.effortAccounts[state.primary]!.state.officialRankIndex] : score === null ? null : rankForElo(score).name,
    records, overtakes: state.lifetimeOvertakes, rounds: clubLifetimeTotals(state, now).weeks,
    streak: streak.count, streakActive: streak.active,
    displayTimeZone: accountTimeZone(state),
  };
}

export function parseAthleteCardMessage(value: unknown): { model: AthleteCardModel; active: boolean; appearance: "light" | "dark" } | null {
  if (!value || typeof value !== "object") return null;
  const message = value as { type?: unknown; model?: Partial<AthleteCardModel>; active?: unknown; appearance?: unknown };
  const m = message.model;
  if (message.type !== "athlete-card" || typeof message.active !== "boolean" || !m ||
    !(message.appearance === undefined || message.appearance === "light" || message.appearance === "dark") ||
    ![m.name, m.city, m.initials, m.sport].every(s => typeof s === "string") ||
    !(m.location === undefined || typeof m.location === "string") ||
    !(m.countryCode === undefined || m.countryCode === null || typeof m.countryCode === "string") ||
    !(m.avatarUrl === null || typeof m.avatarUrl === "string") ||
    !(m.score === null || (typeof m.score === "number" && Number.isFinite(m.score))) ||
    !(m.rank === null || typeof m.rank === "string") || typeof m.streakActive !== "boolean" ||
    ![m.overtakes, m.rounds, m.streak].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0) ||
    !Array.isArray(m.records) || m.records.length > 4 || !m.records.every(r => r &&
      typeof r.label === "string" && typeof r.value === "string" && typeof r.date === "string" &&
      (r.id === undefined || typeof r.id === "string") &&
      (r.kind === undefined || r.kind === "record" || r.kind === "achievement" || r.kind === "stat"))) return null;
  return { model: m as AthleteCardModel, active: message.active, appearance: message.appearance === "dark" ? "dark" : "light" };
}
