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
  personalBests?: AthleteCardHighlightItem[];
  podiums?: number;
  overtakes: number;
  rounds: number;
  streak: number;
  streakActive: boolean;
  lifetime?: { distance: string; activities: string; time: string };
}

export function defaultAthleteCardHighlights(
  state: CompeteState,
  now = competeNow(state),
): AthleteCardHighlightItem[] {
  return defaultHighlightOptions(state, athleteCardHighlightCatalog(state, now)).map(cardHighlightItem);
}

/** Default selection shared by the card and its customizer. */
export function defaultAthleteCardHighlightIds(
  state: CompeteState,
  now = competeNow(state),
): string[] {
  return defaultHighlightOptions(state, athleteCardHighlightCatalog(state, now)).map(item => item.id);
}

function cardHighlightItem({ id, kind, label, value, date }: AthleteCardHighlightOption): AthleteCardHighlightItem {
  return { id, kind, label, value, date };
}

function defaultHighlightOptions(state: CompeteState, catalog: AthleteCardHighlightOption[]) {
  const primaryRecords = catalog.filter(item => item.id.startsWith(`pb:${state.primary}:`));
  return [...primaryRecords, ...catalog.filter(item => !primaryRecords.includes(item))]
    .slice(0, ATHLETE_CARD_HIGHLIGHT_LIMIT);
}

/** Pickable PBs, earned achievements, and statistics for Row 1 of the Athlete Card. */
export function athleteCardHighlightCatalog(
  state: CompeteState,
  now = competeNow(state),
): AthleteCardHighlightOption[] {
  const options: AthleteCardHighlightOption[] = [];

  const bestRecords = new Map(personalRecordHistory(state, now).map(record => [`${record.sport}:${record.distanceId}`, record]));
  for (const record of bestRecords.values()) {
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
  const options = athleteCardHighlightCatalog(state, now);
  const catalog = new Map(options.map(item => [item.id, item]));
  const highlights = Array.isArray(state.cardHighlights)
    ? state.cardHighlights.slice(0, ATHLETE_CARD_HIGHLIGHT_LIMIT).flatMap(id => {
        const item = catalog.get(id);
        return item ? [item] : [];
      })
    : defaultHighlightOptions(state, options);
  const records = highlights.map(cardHighlightItem);
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
    personalBests: options.filter(item => item.id.startsWith(`pb:${state.primary}:`)).slice(0, 3).map(cardHighlightItem),
    podiums: Number(catalog.get("stat:podiums")!.value),
    records, overtakes: state.lifetimeOvertakes, rounds: clubLifetimeTotals(state, now).weeks,
    streak: streak.count, streakActive: streak.active,
    lifetime: {
      distance: catalog.get("stat:distance")!.value,
      activities: catalog.get("stat:sessions")!.value,
      time: catalog.get("stat:time")!.value,
    },
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
    !(m.podiums === undefined || (typeof m.podiums === "number" && Number.isInteger(m.podiums) && m.podiums >= 0)) ||
    !(m.personalBests === undefined || (Array.isArray(m.personalBests) && m.personalBests.length <= 3 && m.personalBests.every(r => r &&
      typeof r.label === "string" && typeof r.value === "string" && typeof r.date === "string" &&
      (r.id === undefined || typeof r.id === "string") && (r.kind === undefined || r.kind === "record")))) ||
    !(m.lifetime === undefined || (m.lifetime !== null && typeof m.lifetime === "object" &&
      [m.lifetime.distance, m.lifetime.activities, m.lifetime.time].every(value => typeof value === "string"))) ||
    ![m.overtakes, m.rounds, m.streak].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0) ||
    !Array.isArray(m.records) || m.records.length > 4 || !m.records.every(r => r &&
      typeof r.label === "string" && typeof r.value === "string" && typeof r.date === "string" &&
      (r.id === undefined || typeof r.id === "string") &&
      (r.kind === undefined || r.kind === "record" || r.kind === "achievement" || r.kind === "stat"))) return null;
  return { model: m as AthleteCardModel, active: message.active, appearance: message.appearance === "dark" ? "dark" : "light" };
}
