import { competeNow, ELO_UNRANKED, type CompeteState } from "./compete";
import { APP_TIMEZONE, dayKey } from "./timezone";
import type { TrainingRange } from "./training-types";

/** Shared presentation model for the Open / GPS effort history with range support. */
export function effortHistory(
  state: CompeteState,
  track: "open" | "verified",
  user?: { createdAt?: string } | null,
  email?: string | null,
  range: TrainingRange = "month",
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

  const effectiveElo = currentElo <= 0 ? ELO_UNRANKED : currentElo;
  const baselineValue =
    history.length > 0 ? history[0].eloBefore : effectiveElo;

  const msPerDay = 24 * 3600 * 1000;
  const pointsCount = range === "year" ? 52 : range === "week" ? 7 : 30;
  const stepMs = range === "year" ? 7 * msPerDay : msPerDay;

  const windowStart = new Date(
    calendarToday.getTime() - (pointsCount - 1) * stepMs,
  );
  const windowMid = new Date(
    calendarToday.getTime() - Math.round((pointsCount - 1) / 2) * stepMs,
  );
  const windowEnd = calendarToday;

  const dailyValues: number[] = [];
  for (let i = 0; i < pointsCount - 1; i++) {
    const pointDate = new Date(windowStart.getTime() + i * stepMs);
    const dayIso = dayKey(pointDate);
    const matching = history.filter(
      (r) => dayKey(new Date(r.periodEnd)) <= dayIso,
    );
    if (matching.length > 0) {
      dailyValues.push(matching[matching.length - 1].eloAfter);
    } else {
      dailyValues.push(baselineValue);
    }
  }
  // The current day is always the last day of the period
  dailyValues.push(effectiveElo);

  const minVal = Math.min(...dailyValues);
  const maxVal = Math.max(...dailyValues);
  let yMin: number;
  let yMid: number;
  let yMax: number;

  if (effectiveElo <= 0 && maxVal <= 0) {
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
    const xPos = xStart + (i / (pointsCount - 1)) * (xEnd - xStart);
    const pointDate = new Date(windowStart.getTime() + i * stepMs);
    return {
      date: pointDate.toISOString(),
      x: xPos,
      y: yBottom - ((v - yMin) / (yMax - yMin || 1)) * (yBottom - yTop),
    };
  });

  const lastPoint = pts[pts.length - 1]!;
  const linePoints =
    pts.length > 1
      ? pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
      : "";
  const areaPoints =
    pts.length > 1
      ? `${linePoints} ${lastPoint.x.toFixed(1)},${yBottom} ${pts[0]!.x.toFixed(1)},${yBottom}`
      : "";

  const startDateLabel = windowStart.toLocaleDateString("en-US", {
    month: "short",
    ...(range === "year" ? { year: "numeric" } : { day: "numeric" }),
    timeZone: APP_TIMEZONE,
  });
  const midDateLabel = windowMid.toLocaleDateString("en-US", {
    month: "short",
    ...(range === "year" ? {} : { day: "numeric" }),
    timeZone: APP_TIMEZONE,
  });
  const todayDateLabel = today.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
  const endDateLabel = todayDateLabel;

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
    range,
  };
}
