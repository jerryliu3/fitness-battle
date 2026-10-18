import { competeNow, ELO_UNRANKED, type CompeteState } from "./compete";
import { APP_TIMEZONE, dayKey } from "./timezone";

/** Shared presentation model for the 30-day Open / GPS effort history. */
export function effortHistory(
  state: CompeteState,
  track: "open" | "verified",
  user?: { createdAt?: string } | null,
  email?: string | null,
) {
  const rating = state.ratings.find((r) => r.sport === state.primary);
  const currentElo =
    (track === "open" ? rating?.openElo : rating?.verifiedElo) ?? ELO_UNRANKED;
  const today = competeNow(state);
  const calendarToday = new Date(`${dayKey(today)}T12:00:00.000Z`);

  const history = state.periodResults
    .filter(
      (r) =>
        r.sport === state.primary &&
        r.track === track &&
        Number.isFinite(Date.parse(r.periodStart)) &&
        Number.isFinite(Date.parse(r.periodEnd)),
    )
    .slice()
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart));

  const isGuest = (!user && !email) || state.name === "Guest";
  const effectiveElo = currentElo <= 0 ? ELO_UNRANKED : currentElo;

  // Determine user's start anchor date (account creation or earliest activity/period)
  let earliestDate: Date;
  if (isGuest) {
    earliestDate = calendarToday;
  } else {
    const candidateTimestamps: number[] = [];
    if (user?.createdAt) {
      candidateTimestamps.push(new Date(user.createdAt).getTime());
    }
    if (history.length > 0) {
      candidateTimestamps.push(new Date(history[0].periodStart).getTime());
    }
    if (state.activities.length > 0) {
      candidateTimestamps.push(
        ...state.activities.map((a) => new Date(a.startedAt).getTime()),
      );
    }
    const valid = candidateTimestamps.filter(
      (value) => Number.isFinite(value) && value <= today.getTime(),
    );
    const earliest = valid.length ? new Date(Math.min(...valid)) : today;
    earliestDate = new Date(`${dayKey(earliest)}T12:00:00.000Z`);
  }

  // Days elapsed from account start to today
  const msPerDay = 24 * 3600 * 1000;
  const daysElapsed = isGuest
    ? 0
    : Math.max(
        0,
        Math.floor(
          (calendarToday.getTime() - earliestDate.getTime()) / msPerDay,
        ),
      );
  const isRolling = daysElapsed >= 28;

  let windowStart: Date;
  let windowMid: Date;
  let windowEnd: Date;
  let activeDaysCount: number;

  if (isRolling) {
    windowStart = new Date(calendarToday.getTime() - 29 * msPerDay);
    windowMid = new Date(calendarToday.getTime() - 15 * msPerDay);
    windowEnd = calendarToday;
    activeDaysCount = 30;
  } else {
    // 1-day gap before earliest activity date so the first point is not directly on the Y-axis
    windowStart = new Date(earliestDate.getTime() - msPerDay);
    windowMid = new Date(windowStart.getTime() + 15 * msPerDay);
    windowEnd = new Date(windowStart.getTime() + 29 * msPerDay);
    activeDaysCount = Math.min(30, daysElapsed + 2);
  }

  const dailyValues: number[] = [];
  if (isRolling) {
    for (let d = 29; d >= 0; d--) {
      const dayDate = new Date(calendarToday.getTime() - d * msPerDay);
      const dayIso = dayKey(dayDate);
      const matching = history.filter(
        (r) => dayKey(new Date(r.periodEnd)) <= dayIso,
      );
      if (matching.length > 0) {
        dailyValues.push(matching[matching.length - 1].eloAfter);
      } else if (history.length > 0) {
        dailyValues.push(history[0].eloBefore);
      } else {
        dailyValues.push(effectiveElo);
      }
    }
    dailyValues[29] = effectiveElo;
  } else {
    // Day 0 (at Y-axis): baseline / same as today if <30 days of activity without history
    const baselineValue =
      history.length > 0 ? history[0].eloBefore : effectiveElo;
    dailyValues.push(baselineValue);

    // Days 1 .. activeDaysCount - 1 (from earliestDate up to today)
    for (let d = 1; d < activeDaysCount; d++) {
      const dayDate = new Date(windowStart.getTime() + d * msPerDay);
      const dayIso = dayKey(dayDate);
      const matching = history.filter(
        (r) => dayKey(new Date(r.periodEnd)) <= dayIso,
      );
      if (matching.length > 0) {
        dailyValues.push(matching[matching.length - 1].eloAfter);
      } else {
        dailyValues.push(history.length ? history[0].eloBefore : effectiveElo);
      }
    }
    dailyValues[activeDaysCount - 1] = effectiveElo;
  }

  const minVal = Math.min(...dailyValues);
  const maxVal = Math.max(...dailyValues);
  let yMin: number;
  let yMid: number;
  let yMax: number;

  if (effectiveElo <= 0 && maxVal <= 0) {
    // 0 Elo fallback: bottom is 0, never negative (+/- 20)
    yMin = 0;
    yMid = 20;
    yMax = 40;
  } else {
    const rawMid = (minVal + maxVal) / 2;
    const halfSpread = Math.max(15, (maxVal - minVal) / 2);
    const step = Math.max(10, Math.ceil((halfSpread * 1.25) / 10) * 10);
    const tentativeMid = Math.round(rawMid / 10) * 10;
    if (tentativeMid - step < 0) {
      yMin = 0;
      yMid = step;
      yMax = step * 2;
    } else {
      yMid = tentativeMid;
      yMin = yMid - step;
      yMax = yMid + step;
    }
  }

  // SVG plot area layout (viewBox 0 0 340 150)
  const xStart = 44;
  const xEnd = 326;
  const xMid = Math.round((xStart + xEnd) / 2);
  const yTop = 20;
  const yBottom = 116;
  const yMidPos = Math.round((yTop + yBottom) / 2);

  const pts = dailyValues.map((v, i) => {
    const xPos = xStart + (i / 29) * (xEnd - xStart);
    return {
      x: xPos,
      y: yBottom - ((v - yMin) / (yMax - yMin || 1)) * (yBottom - yTop),
    };
  });

  const lastPoint = pts[pts.length - 1];
  const linePoints =
    pts.length > 1
      ? pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
      : "";
  const areaPoints =
    pts.length > 1
      ? `${linePoints} ${lastPoint.x.toFixed(1)},${yBottom} ${pts[0].x.toFixed(1)},${yBottom}`
      : "";

  const startDateLabel = windowStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
  const midDateLabel = windowMid.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
  const todayDateLabel = today.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
  const endDateLabel = isRolling
    ? `Today (${todayDateLabel})`
    : windowEnd.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: APP_TIMEZONE,
      });

  return {
    effectiveElo,
    dailyValues,
    pts,
    lastPoint,
    linePoints,
    areaPoints,
    yMin,
    yMid,
    yMax,
    xStart,
    xMid,
    xEnd,
    yTop,
    yBottom,
    yMidPos,
    startDateLabel,
    midDateLabel,
    endDateLabel,
  };
}
