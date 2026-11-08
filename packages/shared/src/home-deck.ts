import { clubDuration, clubRivalCardSummary, clubWeekSummary, nextClubRival } from "./club-summary";
import { competeNow, formatVolume, weeklyBoard } from "./compete/engine";
import { countsOnTrack } from "./compete/ledger";
import { competitionTrack, sportById, type Activity, type CompeteState } from "./compete/sports";
import { suggestionForState } from "./compete/suggestion";
import { buildHealth7DayCorridorModel, homeHealthMetrics } from "./home-health";
import { APP_TIMEZONE, dayKey, getZonedWeekday, shiftAppDay, weeklyPeriodBounds } from "./period";
import { portfolioWeekChart } from "./week-chart";

export type HomeDeckCardId = "session" | "compete" | "route" | "insight";
export type HomeDeckCardTone = "coral" | "forest" | "route" | "lavender";

export interface HomeDeckTonePalette {
  bg: string;
  border: string;
  ink: string;
  muted: string;
  badgeBg: string;
  badgeText: string;
  ctaBg: string;
  ctaText: string;
  accentCircleBg: string;
  accentCircleText: string;
}

export function paletteForDeckTone(
  tone: HomeDeckCardTone,
  isDark = false,
): HomeDeckTonePalette {
  if (tone === "coral") {
    return {
      bg: "#f48c72",
      border: "#e3785d",
      ink: "#1f1715",
      muted: "#4a332d",
      badgeBg: "rgba(255, 255, 255, 0.72)",
      badgeText: "#1f1715",
      ctaBg: "#1f1715",
      ctaText: "#ffffff",
      accentCircleBg: "rgba(31, 23, 21, 0.1)",
      accentCircleText: "#1f1715",
    };
  }
  if (tone === "forest") {
    return {
      bg: "#16382c",
      border: "#255242",
      ink: "#f6faf7",
      muted: "#b8d0c5",
      badgeBg: "#d9f366",
      badgeText: "#142b23",
      ctaBg: "#d9f366",
      ctaText: "#142b23",
      accentCircleBg: "rgba(217, 243, 102, 0.16)",
      accentCircleText: "#d9f366",
    };
  }
  if (tone === "lavender") {
    return {
      bg: isDark ? "#2c2747" : "#dcd4fc",
      border: isDark ? "#433c68" : "#c7bcf5",
      ink: isDark ? "#f5f3ff" : "#1e1936",
      muted: isDark ? "#c4bdfa" : "#49416e",
      badgeBg: isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(255, 255, 255, 0.75)",
      badgeText: isDark ? "#f5f3ff" : "#1e1936",
      ctaBg: isDark ? "#f5f3ff" : "#1e1936",
      ctaText: isDark ? "#1e1936" : "#ffffff",
      accentCircleBg: isDark
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(30, 25, 54, 0.08)",
      accentCircleText: isDark ? "#f5f3ff" : "#1e1936",
    };
  }
  return {
    bg: isDark ? "#1d312c" : "#eef4f0",
    border: isDark ? "#314f47" : "#d5e2d9",
    ink: isDark ? "#f2f8f5" : "#182c25",
    muted: isDark ? "#acc4ba" : "#4f665d",
    badgeBg: isDark ? "rgba(255, 255, 255, 0.12)" : "#ffffff",
    badgeText: isDark ? "#f2f8f5" : "#182c25",
    ctaBg: isDark ? "#d9f366" : "#182c25",
    ctaText: isDark ? "#142b23" : "#ffffff",
    accentCircleBg: isDark
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(24, 44, 37, 0.08)",
    accentCircleText: isDark ? "#f2f8f5" : "#182c25",
  };
}

export type HomeRouteStopStatus =
  | "logged"
  | "today-logged"
  | "today-open"
  | "missed"
  | "future";

export interface HomeRouteDayStop {
  index: number;
  day: string;
  weekdayShort: string;
  dateLabel: string;
  status: HomeRouteStopStatus;
  sessionCount: number;
  movingSec: number;
  distanceM: number;
  volumeLabel: string | null;
  activityIds: string[];
}

export interface HomeRouteWeekModel {
  weekNumber: number;
  headline: string;
  subtitle: string;
  todayIndex: number;
  stops: HomeRouteDayStop[];
}

export type HomeDeckCardAction =
  | { type: "open-today-session" }
  | { type: "navigate"; href: string };

export interface HomeDeckCard {
  id: HomeDeckCardId;
  tone: HomeDeckCardTone;
  badge: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  action: HomeDeckCardAction;
  routeWeek?: HomeRouteWeekModel;
}

const WEEKDAY_SHORT = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const VALID_CARD_IDS: readonly HomeDeckCardId[] = ["session", "compete", "route", "insight"];

function easternWeekNumber(at: Date): number {
  const key = dayKey(at, APP_TIMEZONE);
  const [yearStr, monthStr, dayStr] = key.split("-");
  const utc = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr)));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.max(1, Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7));
}

function formatDayVolume(activities: readonly Activity[], state: CompeteState): string | null {
  if (activities.length === 0) return null;
  const totalSec = activities.reduce((sum, a) => sum + Math.max(0, a.movingSec || 0), 0);
  const firstSport = activities[0]!.sport;
  const sameSport = activities.every((a) => a.sport === firstSport);
  const totalDist = activities.reduce((sum, a) => sum + Math.max(0, a.distanceM || 0), 0);
  if (sameSport && sportById(firstSport).gps && totalDist > 0) {
    return formatVolume(firstSport, totalDist, totalSec, state.units);
  }
  return clubDuration(totalSec);
}

export function buildHomeRouteWeek(
  state: CompeteState,
  now: Date = competeNow(state),
): HomeRouteWeekModel {
  const period = weeklyPeriodBounds(now);
  const today = dayKey(now, APP_TIMEZONE);
  const weekday = getZonedWeekday(now, APP_TIMEZONE);
  const todayIndex = Math.min(6, Math.max(0, weekday === 0 ? 6 : weekday - 1));
  const weekNumber = easternWeekNumber(now);

  const eligible = state.activities.filter(
    (a) =>
      countsOnTrack(a, "open") &&
      Number.isFinite(Date.parse(a.startedAt)) &&
      Date.parse(a.startedAt) <= now.getTime() &&
      Date.parse(a.startedAt) >= period.startsAt.getTime() &&
      Date.parse(a.startedAt) < period.endsAt.getTime(),
  );

  const byDay = new Map<string, Activity[]>();
  for (const activity of eligible) {
    const key = dayKey(new Date(activity.startedAt), APP_TIMEZONE);
    const list = byDay.get(key);
    if (list) list.push(activity);
    else byDay.set(key, [activity]);
  }

  const stops: HomeRouteDayStop[] = Array.from({ length: 7 }, (_, index) => {
    const at = shiftAppDay(period.startsAt, index);
    const key = dayKey(at, APP_TIMEZONE);
    const dayActivities = (byDay.get(key) ?? []).sort((a, b) =>
      a.startedAt.localeCompare(b.startedAt),
    );
    const sessionCount = dayActivities.length;
    const movingSec = dayActivities.reduce((sum, a) => sum + Math.max(0, a.movingSec || 0), 0);
    const distanceM = dayActivities.reduce((sum, a) => sum + Math.max(0, a.distanceM || 0), 0);
    const status: HomeRouteStopStatus =
      key === today
        ? sessionCount > 0
          ? "today-logged"
          : "today-open"
        : key < today
          ? sessionCount > 0
            ? "logged"
            : "missed"
          : "future";

    return {
      index,
      day: key,
      weekdayShort: WEEKDAY_SHORT[index]!,
      dateLabel: at.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: APP_TIMEZONE,
      }),
      status,
      sessionCount,
      movingSec,
      distanceM,
      volumeLabel: formatDayVolume(dayActivities, state),
      activityIds: dayActivities.map((a) => a.id),
    };
  });

  const activeDays = stops.filter((s) => s.sessionCount > 0).length;
  const totalSessions = stops.reduce((sum, s) => sum + s.sessionCount, 0);

  const headline =
    totalSessions > 0 ? "Good things are in motion." : "Your week is taking shape.";
  const subtitle =
    totalSessions > 0
      ? `${totalSessions} session${totalSessions === 1 ? "" : "s"} logged across ${activeDays} day${activeDays === 1 ? "" : "s"}. Here’s the path you’re building.`
      : "No sessions logged yet this week. Start today’s move to light up your path.";

  return {
    weekNumber,
    headline,
    subtitle,
    todayIndex,
    stops,
  };
}

export function buildHomeDeck(
  state: CompeteState,
  options?: { now?: Date; hiddenRivalIds?: readonly string[] },
): HomeDeckCard[] {
  const now = options?.now ?? competeNow(state);
  const hiddenIds = new Set(options?.hiddenRivalIds ?? []);
  const suggestion = suggestionForState(state, now);
  const routeWeek = buildHomeRouteWeek(state, now);
  const todayStop = routeWeek.stops[routeWeek.todayIndex]!;
  const todayLogged = todayStop.sessionCount > 0;

  const sessionBadge = todayLogged
    ? "COMPLETED TODAY"
    : suggestion.kind === "easy"
      ? "RECOVERY-FRIENDLY"
      : suggestion.kind === "rest"
        ? "REST & RECOVER"
        : suggestion.kind === "long"
          ? "ENDURANCE BUILD"
          : suggestion.kind === "quality"
            ? "STEADY EFFORT"
            : "RACE DAY";

  const cleanSuggestionTitle = suggestion.title.replace(/\.$/, "");
  const sessionTitle = todayLogged && todayStop.volumeLabel
    ? `${todayStop.volumeLabel} logged today.`
    : `${cleanSuggestionTitle}.`;

  const rawDetail = suggestion.detail.split(".")[0]?.trim();
  const sessionSubtitle = todayLogged
    ? "Counted toward your weekly training effort."
    : rawDetail ? `${rawDetail}.` : suggestion.detail;

  const sessionCard: HomeDeckCard = {
    id: "session",
    tone: "coral",
    badge: sessionBadge,
    title: sessionTitle,
    subtitle: sessionSubtitle,
    ctaLabel: todayLogged ? "Review session" : "Explore session",
    action: { type: "open-today-session" },
  };

  // Card 2: Competition / Rival Update
  const sport =
    state.ratings.find((r) => r.sport === state.primary && r.optedIn)?.sport ??
    state.ratings.find((r) => r.optedIn)?.sport;
  const board = sport ? weeklyBoard(state, sport, competitionTrack(sport), now) : [];
  const rawSummary = clubRivalCardSummary(
    board,
    sport,
    state.units,
    state.enrollments.find((e) => e.sport === sport)?.syntheticIds,
  );
  const nextRival = nextClubRival(board).rival;
  const rivalHidden = Boolean(nextRival && hiddenIds.has(nextRival.id));
  const competeHeadline = rivalHidden ? "Your field is moving." : rawSummary.headline;

  const competeCard: HomeDeckCard = {
    id: "compete",
    tone: "forest",
    badge: rawSummary.place
      ? `${rawSummary.place.toUpperCase()} PLACE`
      : sport
        ? sportById(sport).name.toUpperCase()
        : "COMPETE",
    title: competeHeadline.endsWith(".") ? competeHeadline : `${competeHeadline}.`,
    subtitle: "Closest rival in your active field.",
    ctaLabel: sport ? `Open ${sportById(sport).name} field` : "Open field",
    action: { type: "navigate", href: sport ? `/arena?event=${sport}` : "/arena" },
  };

  // Card 3: Week Route Path
  const activeDays = routeWeek.stops.filter((s) => s.sessionCount > 0).length;
  const totalSessions = routeWeek.stops.reduce((sum, s) => sum + s.sessionCount, 0);
  const routeHeadline = routeWeek.headline.endsWith(".") ? routeWeek.headline : `${routeWeek.headline}.`;
  const routeSubtitle = totalSessions > 0
    ? `${totalSessions} session${totalSessions === 1 ? "" : "s"} logged across ${activeDays} active day${activeDays === 1 ? "" : "s"}.`
    : "No sessions recorded yet this week.";

  const routeCard: HomeDeckCard = {
    id: "route",
    tone: "route",
    badge: `WEEK ${routeWeek.weekNumber}`,
    title: routeHeadline,
    subtitle: routeSubtitle,
    ctaLabel: "Open full week",
    action: { type: "navigate", href: "/week" },
    routeWeek,
  };

  // Card 4: Health & Momentum Insight
  const healthMetrics = homeHealthMetrics(state, now);
  const corridorModels = healthMetrics.map((m) => ({
    metric: m,
    chart: buildHealth7DayCorridorModel(m, now),
  }));
  const availableToday = corridorModels.filter((item) => item.metric.value !== "—");

  let insightCard: HomeDeckCard;
  if (availableToday.length > 0) {
    const bouncedBack = availableToday.find(({ chart }) => {
      const todayPt = chart.points[6];
      const priorOut = chart.points
        .slice(0, 6)
        .some((p) => p.position === "under" || p.position === "over");
      return todayPt?.position === "in" && priorOut;
    });
    const underOrOver = availableToday.find(({ chart }) => {
      const todayPt = chart.points[6];
      return todayPt?.position === "under" || todayPt?.position === "over";
    });

    const insightTitle = bouncedBack
      ? "Your body bounced back."
      : underOrOver
        ? `${underOrOver.metric.name} shifted from baseline.`
        : "Body signals look steady.";

    const insightSubtitle = bouncedBack
      ? `${bouncedBack.metric.name} returned to your 7-day range today.`
      : underOrOver
        ? `Today’s reading is outside your recent corridor.`
        : "Daily health signals are tracking within your usual range.";

    insightCard = {
      id: "insight",
      tone: "lavender",
      badge: bouncedBack
        ? "BOUNCED BACK"
        : underOrOver
          ? "RECOVERY WATCH"
          : "STEADY SIGNALS",
      title: insightTitle,
      subtitle: insightSubtitle,
      ctaLabel: "Explore progress",
      action: { type: "navigate", href: "/you" },
    };
  } else {
    const week = clubWeekSummary(state, now);
    const chart = portfolioWeekChart(state, now);
    const ahead = chart.currHoursSameDay > chart.prevHoursSameDay;
    const title =
      week.sessions >= 3
        ? "You’re building consistency."
        : ahead
          ? "Ahead of last week’s pace."
          : "A good day to keep moving.";
    const subtitle =
      week.sessions > 0
        ? `${week.sessions} sessions across ${week.activeDays} active days this week.`
        : "Connect a tracker to unlock recovery and pace insights.";

    insightCard = {
      id: "insight",
      tone: "lavender",
      badge: week.sessions >= 3 ? "CONSISTENT" : ahead ? "AHEAD OF PACE" : "FRESH WEEK",
      title,
      subtitle,
      ctaLabel: "Explore progress",
      action: { type: "navigate", href: "/you" },
    };
  }

  return [sessionCard, competeCard, routeCard, insightCard];
}

export function homeDeckDismissStorageKey(accountKey: string, now: Date): string {
  const safeAccount = encodeURIComponent((accountKey || "guest").trim() || "guest");
  return `fb:home-deck-dismissed:v1:${safeAccount}:${dayKey(now, APP_TIMEZONE)}`;
}

export function parseDismissedCardIds(raw: string | null | undefined): HomeDeckCardId[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (id): id is HomeDeckCardId =>
        typeof id === "string" && (VALID_CARD_IDS as readonly string[]).includes(id),
    );
  } catch {
    return [];
  }
}

export function serializeDismissedCardIds(ids: readonly HomeDeckCardId[]): string {
  return JSON.stringify([...new Set(ids)]);
}

export function visibleHomeDeckCards(
  cards: readonly HomeDeckCard[],
  dismissedIds: readonly string[],
): HomeDeckCard[] {
  const dismissed = new Set(dismissedIds);
  return cards.filter((card) => !dismissed.has(card.id));
}

/**
 * Pure horizontal swipe threshold check.
 * Requires horizontal displacement >= thresholdPx and dominant horizontal angle
 * so vertical page scrolling never accidentally dismisses a card.
 */
export function shouldSwipeDismiss(
  dx: number,
  dy: number,
  thresholdPx = 56,
): "left" | "right" | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  if (Math.abs(dx) < thresholdPx) return null;
  if (Math.abs(dx) <= Math.abs(dy) * 1.25) return null;
  return dx < 0 ? "left" : "right";
}
