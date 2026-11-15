import type {
  AnalyticsLabModel,
  AnalyticsScenarioId,
  AnalyticsTimeLens,
  AssetHolding,
  CombinedOverlayPoint,
  LoadBucketModel,
  MarketCandle,
  MarketEquityPoint,
  PerformancePointModel,
  SleepNightModel,
  VitalMetricModel,
  VitalPoint,
} from "./analytics-lab";
import { deriveScenarioFromCompeteState, formatMinutesAsHoursMins } from "./analytics-lab";
import { competeNow } from "./compete/engine";
import { countsForTraining } from "./compete/journal";
import type { CompeteState, SportId } from "./compete/sports";
import { collapseNights } from "./compete/health";
import { effortScoreLine } from "./chart-presentation";
import { formatHealthNumber, getHealthMetricCorridor, recordedHealthSeries, isSampleSleepNight } from "./home-health";
import { dayKey, shiftAppDay, startOfZonedDay } from "./period";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function formatDayLabel(key: string): string {
  const parts = key.split("-");
  const monthIdx = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  return `${MONTH_NAMES[monthIdx] ?? "—"} ${day}`;
}

function lensDays(lens: AnalyticsTimeLens): number {
  if (lens === "point") return 3;
  if (lens === "7d") return 7;
  if (lens === "30d") return 30;
  if (lens === "90d") return 90;
  return 90;
}

function sliceDaily<T>(items: readonly T[], lens: AnalyticsTimeLens): T[] {
  if (items.length === 0) return [];
  const n = lensDays(lens);
  if (lens === "all") return [...items];
  return items.slice(-n);
}

function emptySleepNight(): SleepNightModel {
  return {
    id: "empty",
    label: "—",
    score: 0,
    durationMin: 0,
    deepMin: 0,
    remMin: 0,
    lightMin: 0,
    awakeMin: 0,
    efficiencyPct: 0,
    restorativePct: 0,
    bedtimeOffsetHr: 0,
    wakeOffsetHr: 0,
    debtMin: 0,
  };
}

function vitalFromSeries(
  spec: Omit<VitalMetricModel, "series"> & { series: VitalPoint[] },
): VitalMetricModel {
  return spec;
}

function buildHrvVitals(state: CompeteState, now: Date, days: number): VitalMetricModel[] {
  const hrvRows = recordedHealthSeries(state, "hrv", days, now);
  const rhrRows = recordedHealthSeries(state, "resting-hr", days, now);
  const hrvValues = hrvRows.map((r) => r.value).filter((v): v is number => v != null);
  const rhrValues = rhrRows.map((r) => r.value).filter((v): v is number => v != null);
  const hrvCorridor = getHealthMetricCorridor("hrv", hrvValues);
  const rhrCorridor = getHealthMetricCorridor("resting-hr", rhrValues);

  const hrvSeries: VitalPoint[] = hrvRows
    .filter((r) => r.value != null)
    .map((r) => ({
      day: r.day,
      label: r.label,
      value: r.value!,
      rolling7d: r.value!,
      baselineLow: hrvCorridor?.low ?? r.value!,
      baselineHigh: hrvCorridor?.high ?? r.value!,
    }));

  const rhrSeries: VitalPoint[] = rhrRows
    .filter((r) => r.value != null)
    .map((r) => ({
      day: r.day,
      label: r.label,
      value: r.value!,
      rolling7d: r.value!,
      baselineLow: rhrCorridor?.low ?? r.value!,
      baselineHigh: rhrCorridor?.high ?? r.value!,
    }));

  const hrvNow = hrvSeries.at(-1)?.value ?? 0;
  const rhrNow = rhrSeries.at(-1)?.value ?? 0;

  const metrics: VitalMetricModel[] = [
    vitalFromSeries({
      id: "hrv",
      name: "Heart Rate Variability",
      shortName: "HRV (rMSSD)",
      unit: "ms",
      current: hrvNow,
      formattedCurrent: hrvSeries.length ? `${formatHealthNumber(hrvNow)} ms` : "—",
      deltaLabel: hrvSeries.length ? "Recorded observations" : "No recorded data",
      baselineMin: hrvCorridor?.low ?? 0,
      baselineMax: hrvCorridor?.high ?? 0,
      baselineMean: hrvCorridor ? (hrvCorridor.low + hrvCorridor.high) / 2 : 0,
      zScore: 0,
      status: hrvSeries.length ? "normal" : "normal",
      statusLabel: hrvSeries.length ? "Recorded" : "No data",
      higherIsBetter: true,
      provider: "Connected tracker",
      insight: hrvSeries.length
        ? "HRV from your synced overnight readings in this window."
        : "No overnight HRV recorded in this window.",
      series: hrvSeries,
    }),
    vitalFromSeries({
      id: "rhr",
      name: "Resting Heart Rate",
      shortName: "Resting HR",
      unit: "bpm",
      current: rhrNow,
      formattedCurrent: rhrSeries.length ? `${formatHealthNumber(rhrNow)} bpm` : "—",
      deltaLabel: rhrSeries.length ? "Recorded observations" : "No recorded data",
      baselineMin: rhrCorridor?.low ?? 0,
      baselineMax: rhrCorridor?.high ?? 0,
      baselineMean: rhrCorridor ? (rhrCorridor.low + rhrCorridor.high) / 2 : 0,
      zScore: 0,
      status: rhrSeries.length ? "normal" : "normal",
      statusLabel: rhrSeries.length ? "Recorded" : "No data",
      higherIsBetter: false,
      provider: "Connected tracker",
      insight: rhrSeries.length
        ? "Resting heart rate from synced daily samples."
        : "No resting heart rate recorded in this window.",
      series: rhrSeries,
    }),
  ];

  return metrics;
}

function buildSleepBlock(state: CompeteState, now: Date, days: number, timeLens: AnalyticsTimeLens) {
  const today = dayKey(now);
  const start = dayKey(shiftAppDay(startOfZonedDay(now), -(days - 1)));
  const nights = collapseNights(
    (state.sleepNights ?? []).filter(
      (night) =>
        !isSampleSleepNight(state, night) &&
        night.day >= start &&
        night.day <= today &&
        Number.isFinite(night.durationMin) &&
        night.durationMin > 0,
    ),
  );

  let runningDebt = 0;
  const rawNights: SleepNightModel[] = nights.map((night) => {
    const deep = night.deepMin ?? 0;
    const rem = night.remMin ?? 0;
    const light = night.lightMin ?? Math.max(0, night.durationMin - deep - rem);
    const awake = night.awakeMin ?? 0;
    const efficiencyPct =
      night.efficiency != null
        ? Math.round(night.efficiency)
        : night.durationMin > 0
          ? Math.round(((night.durationMin - awake) / night.durationMin) * 100)
          : 0;
    const restorativePct =
      night.durationMin > 0 ? Math.round(((deep + rem) / night.durationMin) * 100) : 0;
    runningDebt = Math.max(-60, Math.min(240, Math.round(runningDebt + (480 - night.durationMin) * 0.65)));

    return {
      id: night.id,
      label: formatDayLabel(night.day),
      score: Number.isFinite(night.score) ? Math.round(night.score) : 0,
      durationMin: night.durationMin,
      deepMin: deep,
      remMin: rem,
      lightMin: light,
      awakeMin: awake,
      efficiencyPct,
      restorativePct,
      bedtimeOffsetHr: 0,
      wakeOffsetHr: 0,
      debtMin: runningDebt,
    };
  });

  const sliced = sliceDaily(rawNights, timeLens);
  const lastNight = rawNights.at(-1) ?? emptySleepNight();
  const avgScore = sliced.length
    ? Math.round(sliced.reduce((s, n) => s + n.score, 0) / sliced.length)
    : 0;
  const avgDurationMin = sliced.length
    ? Math.round(sliced.reduce((s, n) => s + n.durationMin, 0) / sliced.length)
    : 0;
  const avgRestorativePct = sliced.length
    ? Math.round(sliced.reduce((s, n) => s + n.restorativePct, 0) / sliced.length)
    : 0;

  return {
    lastNight,
    avgScore,
    avgDurationFormatted: avgDurationMin ? formatMinutesAsHoursMins(avgDurationMin) : "—",
    avgRestorativePct,
    cumulativeDebtMin: lastNight.debtMin,
    circadianRegularityPct: 0,
    contestRankLabel: "—",
    nights: sliced,
  };
}

function activityHoursByDay(state: CompeteState, now: Date, days: number) {
  const startMs = shiftAppDay(startOfZonedDay(now), -(days - 1)).getTime();
  const byDay = new Map<string, { total: number; bySport: Partial<Record<SportId, number>> }>();

  for (const act of state.activities ?? []) {
    if (!countsForTraining(act)) continue;
    const at = Date.parse(act.startedAt);
    if (!Number.isFinite(at) || at < startMs || at > now.getTime()) continue;
    const key = dayKey(new Date(act.startedAt));
    const bucket = byDay.get(key) ?? { total: 0, bySport: {} };
    const hours = act.movingSec / 3600;
    bucket.total += hours;
    bucket.bySport[act.sport] = (bucket.bySport[act.sport] ?? 0) + hours;
    byDay.set(key, bucket);
  }

  const keys: string[] = [];
  for (let i = 0; i < days; i++) {
    keys.push(dayKey(shiftAppDay(startOfZonedDay(now), i - (days - 1))));
  }

  return keys.map((key, i) => ({
    id: `ld-${i}`,
    label: formatDayLabel(key),
    key,
    ...(byDay.get(key) ?? { total: 0, bySport: {} }),
  }));
}

function buildLoad(state: CompeteState, now: Date, days: number, timeLens: AnalyticsTimeLens) {
  const daily = activityHoursByDay(state, now, days);
  const loadSecByDay = daily.map((d) => Math.round(d.total * 3600));

  const rawLoad: LoadBucketModel[] = daily.map((day, i) => {
    let acuteSec = 0;
    for (let j = Math.max(0, i - 6); j <= i; j++) acuteSec += loadSecByDay[j] ?? 0;
    let chronicSec = 0;
    for (let j = Math.max(0, i - 27); j <= i; j++) chronicSec += loadSecByDay[j] ?? 0;
    const chronicLoad = Math.max(1, Math.round(chronicSec / 28));
    const acuteLoad = Math.round(acuteSec / 7);
    const acwr = Number((acuteLoad / chronicLoad).toFixed(2));
  const sport = day.bySport;
    return {
      id: day.id,
      label: day.label,
      acuteLoad,
      chronicLoad,
      acwr,
      totalHours: Number(day.total.toFixed(1)),
      runningHours: Number((sport.running ?? 0).toFixed(1)),
      cyclingHours: Number((sport.cycling ?? 0).toFixed(1)),
      strengthHours: Number((sport.strength ?? 0).toFixed(1)),
      walkingHours: Number((sport.walking ?? 0).toFixed(1)),
      cumCurrentHours: Number(
        daily.slice(0, i + 1).reduce((s, d) => s + d.total, 0).toFixed(1),
      ),
      cumGhostHours: 0,
      cumTargetHours: 0,
    };
  });

  const series = sliceDaily(rawLoad, timeLens);
  const latest = rawLoad.at(-1);
  const acwrCurrent = latest?.acwr ?? 0;
  const acwrStatusLabel =
    !latest || latest.totalHours === 0
      ? "No training volume"
      : acwrCurrent > 1.35
        ? "Overreaching (>1.3x)"
        : acwrCurrent >= 0.85
          ? "Sweet Spot (0.8–1.3x)"
          : "Under-loaded (<0.8x)";

  return {
    acwrCurrent,
    acwrStatusLabel,
    acuteHours7d: latest?.totalHours ?? 0,
    chronicHours28d: latest ? Number((latest.totalHours / Math.max(0.5, acwrCurrent || 1)).toFixed(1)) : 0,
    ghostDeltaHours: 0,
    monotonyScore: 0,
    series,
  };
}

function buildPerformance(state: CompeteState, now: Date, timeLens: AnalyticsTimeLens) {
  const eligible = (state.activities ?? []).filter(
    (a) =>
      countsForTraining(a) &&
      (a.sport === "running" || a.sport === "cycling") &&
      a.distanceM > 0 &&
      a.movingSec > 0 &&
      Date.parse(a.startedAt) <= now.getTime(),
  );

  const byWeek = new Map<string, { distanceM: number; movingSec: number; hrSum: number; hrCount: number }>();
  for (const act of eligible) {
    const weekStart = dayKey(startOfZonedDay(new Date(act.startedAt)));
    const bucket = byWeek.get(weekStart) ?? { distanceM: 0, movingSec: 0, hrSum: 0, hrCount: 0 };
    bucket.distanceM += act.distanceM;
    bucket.movingSec += act.movingSec;
    if (act.avgHr != null && act.avgHr > 0) {
      bucket.hrSum += act.avgHr;
      bucket.hrCount += 1;
    }
    byWeek.set(weekStart, bucket);
  }

  const weeks = [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b));
  const rawPerf: PerformancePointModel[] = weeks.map(([key, bucket], i) => {
    const paceMinKm = bucket.distanceM > 0 ? bucket.movingSec / 60 / (bucket.distanceM / 1000) : 0;
    const avgHr = bucket.hrCount ? Math.round(bucket.hrSum / bucket.hrCount) : 0;
    const speedMPerMin = paceMinKm > 0 ? 1000 / paceMinKm : 0;
    const efficiencyFactor = avgHr > 0 && speedMPerMin > 0 ? Number((speedMPerMin / avgHr).toFixed(2)) : 0;
    return {
      id: `pf-${i}`,
      label: formatDayLabel(key),
      paceMinKm: Number(paceMinKm.toFixed(2)),
      avgHr,
      efficiencyFactor,
      vo2Max: 0,
    };
  });

  const perfSeries =
    timeLens === "all"
      ? rawPerf
      : timeLens === "90d"
        ? rawPerf.slice(-12)
        : timeLens === "30d"
          ? rawPerf.slice(-4)
          : rawPerf.slice(-2);

  const efCurrent = rawPerf.at(-1)?.efficiencyFactor ?? 0;
  const efStart = rawPerf[0]?.efficiencyFactor ?? 0;
  const efDeltaPct =
    efStart > 0 ? Number((((efCurrent - efStart) / efStart) * 100).toFixed(1)) : 0;

  return {
    efCurrent,
    efDeltaPct,
    lowAerobicSharePct: 0,
    highIntensitySharePct: 0,
    polarizationLabel: rawPerf.length ? "From recorded sessions" : "No cardio sessions",
    series: perfSeries,
    zones: [],
    prCurve: [],
  };
}

function buildMarket(state: CompeteState, now: Date, timeLens: AnalyticsTimeLens) {
  const ratings = state.ratings ?? [];
  const rating = ratings.find((r) => r.sport === state.primary);
  const baseNav = rating?.openElo ?? 1000;
  const canChart =
    Array.isArray(state.periodResults) &&
    ratings.length > 0 &&
    Array.isArray(state.activities);
  const chart = canChart ? effortScoreLine(state, "open", "year", now) : null;

  const equitySeries: MarketEquityPoint[] = (chart?.points ?? []).map((p, i) => {
    const nav = Number(p.value) || baseNav;
    return {
      id: `eq-${i}`,
      label: p.label,
      nav,
      sma4: nav,
      ema12: nav,
      drawdownPct: 0,
      dividendPts: 0,
      volumeHours: 0,
    };
  });

  const slicedEquity = sliceDaily(equitySeries, timeLens);
  const currentIndex = equitySeries.at(-1)?.nav ?? baseNav;
  const startNav = slicedEquity[0]?.nav ?? currentIndex;
  const allTimeReturnPts = currentIndex - 1000;
  const allTimeReturnPct = Number(((allTimeReturnPts / 1000) * 100).toFixed(1));
  const periodReturnPts = currentIndex - startNav;
  const periodReturnPct = Number(((periodReturnPts / Math.max(1, startNav)) * 100).toFixed(1));

  const candles: MarketCandle[] = [];

  let runSec = 0;
  let cycSec = 0;
  let strSec = 0;
  let otherSec = 0;
  for (const act of state.activities ?? []) {
    if (!countsForTraining(act)) continue;
    if (act.sport === "running") runSec += act.movingSec;
    else if (act.sport === "cycling") cycSec += act.movingSec;
    else if (act.sport === "strength") strSec += act.movingSec;
    else otherSec += act.movingSec;
  }
  const runHours = Number((runSec / 3600).toFixed(1));
  const cycHours = Number((cycSec / 3600).toFixed(1));
  const strHours = Number((strSec / 3600).toFixed(1));
  const sleepHours = Number(
    (
      (state.sleepNights ?? [])
        .filter((n) => !isSampleSleepNight(state, n))
        .reduce(
          (s, n) => s + (Number.isFinite(n.durationMin) ? n.durationMin : 0),
          0,
        ) / 60
    ).toFixed(1),
  );
  const totalActHours = runHours + cycHours + strHours + otherSec / 3600 + sleepHours;
  const share = (hours: number) =>
    totalActHours > 0 ? Math.round((hours / totalActHours) * 100) : 0;

  const holdings: AssetHolding[] = totalActHours > 0
    ? [
        { sport: "Running (GPS)", ticker: "RUN", sharePct: share(runHours), hours: runHours, returnPts: 0, yieldPerHour: 0, colorKey: "teal" },
        { sport: "Cycling (GPS)", ticker: "CYC", sharePct: share(cycHours), hours: cycHours, returnPts: 0, yieldPerHour: 0, colorKey: "tennis" },
        { sport: "Strength (Open)", ticker: "STR", sharePct: share(strHours), hours: strHours, returnPts: 0, yieldPerHour: 0, colorKey: "ink" },
        { sport: "Sleep & Recovery", ticker: "SLP", sharePct: share(sleepHours), hours: sleepHours, returnPts: 0, yieldPerHour: 0, colorKey: "green" },
      ].filter((h) => h.hours > 0)
    : [];

  return {
    tickerSymbol: "$ATHL",
    currentIndex,
    allTimeReturnPts,
    allTimeReturnPct,
    periodReturnPts,
    periodReturnPct,
    maxDrawdownPct: 0,
    sharpeEfficiency: 0,
    winRatePct: 0,
    goldenCrossActive: false,
    weeklyDividendPts: 0,
    equitySeries: slicedEquity,
    candles,
    holdings,
  };
}

function buildCombined(
  load: ReturnType<typeof buildLoad>,
  sleepNights: SleepNightModel[],
  hrvSeries: VitalPoint[],
  perf: ReturnType<typeof buildPerformance>,
  timeLens: AnalyticsTimeLens,
): AnalyticsLabModel["combined"] {
  const days = Math.max(load.series.length, sleepNights.length, hrvSeries.length, perf.series.length);
  const series: CombinedOverlayPoint[] = [];
  for (let i = 0; i < days; i++) {
    const ld = load.series[i];
    const sl = sleepNights[i];
    const hrv = hrvSeries[i];
    const pf = perf.series[i];
    const strainScore = ld ? Number((ld.totalHours * 2).toFixed(1)) : 0;
    const readiness =
      sl && sl.score > 0 ? sl.score : hrv ? Math.min(96, Math.round(hrv.value)) : 0;
    series.push({
      id: `cmb-${i}`,
      label: ld?.label ?? sl?.label ?? hrv?.label ?? pf?.label ?? "—",
      strainScore,
      nextDayReadiness: readiness,
      nextDayHrv: hrv?.value ?? 0,
      sleepRestorativeHr: sl ? Number(((sl.deepMin + sl.remMin) / 60).toFixed(2)) : 0,
      aerobicEf: pf?.efficiencyFactor ?? 0,
      workoutNote: ld && ld.totalHours > 0 ? "Recorded training" : "—",
    });
  }

  return {
    strainRecoveryCorrelation: 0,
    sleepEfficiencyCorrelation: 0,
    optimalStrainCeiling: 0,
    coachBriefHeadline: series.length ? "Derived from your recorded metrics" : "No synthesis yet",
    coachBriefBody: series.length
      ? "Strain, sleep, HRV, and efficiency are aligned to the same calendar window."
      : "Connect a tracker and log training to populate multi-metric synthesis.",
    series: sliceDaily(series, timeLens),
  };
}

const WINDOW_LABELS: Record<AnalyticsTimeLens, string> = {
  point: "1-Point Snapshot (Today / Latest)",
  "7d": "Last 7 Days · Micro-Trend",
  "30d": "Last 30 Days · Mesocycle",
  "90d": "Last 90 Days · Season Block",
  all: "All-Time Athlete History",
};

/** Product analytics: derived only from CompeteState — empty sections when nothing is recorded. */
export function buildAnalyticsLabModelFromState(
  state: CompeteState,
  timeLens: AnalyticsTimeLens = "30d",
): AnalyticsLabModel {
  const hydrated: CompeteState = {
    ...state,
    links: state.links ?? [],
    activities: state.activities ?? [],
    sleepNights: state.sleepNights ?? [],
    dailyHealth: state.dailyHealth ?? [],
    periodResults: state.periodResults ?? [],
    ratings: state.ratings ?? [],
    readiness: state.readiness ?? [],
  };
  const scenario: AnalyticsScenarioId = deriveScenarioFromCompeteState(hydrated);
  const now = competeNow(hydrated);
  const days = 90;

  const vitalsMetrics = buildHrvVitals(hydrated, now, days);
  const hrvSeries = vitalsMetrics[0]?.series ?? [];
  const sleep = buildSleepBlock(hydrated, now, days, timeLens);
  const load = buildLoad(hydrated, now, days, timeLens);
  const performance = buildPerformance(hydrated, now, timeLens);
  const market = buildMarket(hydrated, now, timeLens);

  const readinessScores = hydrated.readiness.map((r) => r.score).filter((s) => s > 0);
  const readinessComposite = readinessScores.length
    ? Math.round(readinessScores.reduce((a, b) => a + b, 0) / readinessScores.length)
    : sleep.lastNight.score > 0
      ? sleep.lastNight.score
      : 0;

  return {
    scenario,
    timeLens,
    windowLabel: WINDOW_LABELS[timeLens],
    market,
    vitals: {
      readinessComposite,
      autonomicStateLabel: vitalsMetrics[0]?.series.length
        ? "From recorded vitals"
        : "No overnight vitals",
      autonomicSummary: vitalsMetrics[0]?.series.length
        ? "HRV and resting HR are built from synced tracker readings."
        : "No HRV or resting HR recorded in this window.",
      anomalyCount: 0,
      metrics: vitalsMetrics,
      quadrantTrail: [],
    },
    sleep,
    load,
    performance,
    combined: buildCombined(load, sleep.nights, hrvSeries, performance, timeLens),
  };
}