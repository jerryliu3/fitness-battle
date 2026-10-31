import { clamp, unitInterval, type CompeteState } from "./compete/sports";
import { APP_TIMEZONE, dayKey, shiftAppDay } from "./period";

export const ANALYTICS_DOMAIN_IDS = [
  "market",
  "vitals",
  "sleep",
  "load",
  "performance",
  "combined",
] as const;

export type AnalyticsDomainId = (typeof ANALYTICS_DOMAIN_IDS)[number];

export type AnalyticsConceptIndex = 0 | 1 | 2;

export const ANALYTICS_TIME_LENSES = [
  "point",
  "7d",
  "30d",
  "90d",
  "all",
] as const;

export type AnalyticsTimeLens = (typeof ANALYTICS_TIME_LENSES)[number];

export const ANALYTICS_LAYOUT_MODES = [
  "focus_stack",
  "bento_matrix",
  "terminal_ribbon",
] as const;

export type AnalyticsLayoutMode = (typeof ANALYTICS_LAYOUT_MODES)[number];

export const ANALYTICS_SCENARIO_IDS = [
  "peak_build",
  "overreaching",
  "sparse_new",
] as const;

export type AnalyticsScenarioId = (typeof ANALYTICS_SCENARIO_IDS)[number];

export interface AnalyticsConceptSpec {
  index: AnalyticsConceptIndex;
  shortTitle: string;
  title: string;
  subtitle: string;
  bestFor: string;
  encoding: string;
  pointVsTrendBehavior: string;
}

export interface AnalyticsDomainSpec {
  id: AnalyticsDomainId;
  label: string;
  kicker: string;
  headline: string;
  summary: string;
  sources: string[];
  CombineRule: string;
  concepts: readonly [
    AnalyticsConceptSpec,
    AnalyticsConceptSpec,
    AnalyticsConceptSpec,
  ];
}

export interface MobileLayoutSpec {
  id: AnalyticsLayoutMode;
  label: string;
  subtitle: string;
  strengths: string;
  tradeoff: string;
}

export const MOBILE_LAYOUT_SPECS: readonly MobileLayoutSpec[] = [
  {
    id: "focus_stack",
    label: "Focus Stack",
    subtitle: "Editorial single-column cards with generous breathing room",
    strengths: "Highest legibility, zero chart crowding, effortless thumb scroll",
    tradeoff: "Requires vertical scrolling to compare more than 2 metrics",
  },
  {
    id: "bento_matrix",
    label: "Bento Matrix",
    subtitle: "2-column native vitals & metric tiles above an active inspector",
    strengths: "Scans 6–8 metrics at a glance; tap any tile to focus its trend",
    tradeoff: "Micro-sparklines show shape only; relies on tap-to-inspect for axis labels",
  },
  {
    id: "terminal_ribbon",
    label: "Telemetry Ribbon",
    subtitle: "Pinned market ticker + synchronized multi-pane stacked charts",
    strengths: "Best for power athletes comparing time-aligned series & returns",
    tradeoff: "High information density; best suited for dedicated analysis sessions",
  },
] as const;

export const ANALYTICS_DOMAIN_SPECS: readonly AnalyticsDomainSpec[] = [
  {
    id: "market",
    label: "Athlete Market",
    kicker: "Health as an Asset Class",
    headline: "Athlete Equity & All-Time Returns",
    summary:
      "Treats your long-term fitness and Effort Score like a financial portfolio—tracking net index value, weekly OHLC candlesticks, moving-average crossovers, activity dividends, and sport allocation.",
    sources: ["Compete Elo", "Activity Milestones", "Settled Weeks", "Strava / Garmin"],
    CombineRule:
      "Combine cumulative Effort Index with 4W/12W moving averages and bottom volume bars; keep per-sport yield allocation in a separate breakdown card.",
    concepts: [
      {
        index: 0,
        shortTitle: "Equity Curve",
        title: "Concept A · Net Athlete Equity & Moving Average Ribbon",
        subtitle: "All-time return curve with 4W/12W crossover & drawdown shading",
        bestFor: "Long-term motivation, seeing compound returns from consistency",
        encoding: "Area/line price curve + dashed 12W baseline + high-water mark",
        pointVsTrendBehavior:
          "1-Point shows live ticker NAV, today's dividend yield, and 4W momentum spread; Trend shows full equity curve & drawdown.",
      },
      {
        index: 1,
        shortTitle: "Candlesticks",
        title: "Concept B · Weekly OHLC Candlesticks & Volume",
        subtitle: "Week open, intra-week milestone peak, decay floor, and settlement close",
        bestFor: "Understanding weekly volatility, rank battles, and volume-to-score payoff",
        encoding: "Financial OHLC wicks/bodies + paired lower moving-time volume bars",
        pointVsTrendBehavior:
          "1-Point zooms into this week's live candle (Open → Current → Projected Close); Trend shows 12 settled weekly candles.",
      },
      {
        index: 2,
        shortTitle: "Portfolio & Yield",
        title: "Concept C · Asset Allocation & Dividend Ledger",
        subtitle: "Capital weight across sports + weekly milestone dividend payouts",
        bestFor: "Balancing multi-sport training and auditing where points come from",
        encoding: "Proportional allocation bar + sport return rows + dividend yield table",
        pointVsTrendBehavior:
          "1-Point shows current week's sport mix and next +1 step progress; Trend shows all-time cumulative yield per sport.",
      },
    ],
  },
  {
    id: "vitals",
    label: "Vitals Lab",
    kicker: "Autonomic & Physiological Monitoring",
    headline: "Biometric Vitals & Baseline Corridors",
    summary:
      "Continuous monitoring of HRV, Resting HR, VO2max, Respiratory Rate, SpO2, and Skin Temperature—anchored to your personal 60-day normal corridor rather than generic population averages.",
    sources: ["WHOOP", "Oura", "Apple Health", "Garmin", "Health Connect"],
    CombineRule:
      "Never plot raw bpm, ms, and °C on one shared Y-axis. Either show each vital against its own ±1σ baseline band, or normalize into Z-scores (-2σ to +2σ) to compare together.",
    concepts: [
      {
        index: 0,
        shortTitle: "Corridor Band",
        title: "Concept A · Personal Baseline Corridor (7D vs 60D ±1σ)",
        subtitle: "Daily readings + 7-day rolling average inside your normal physiological tunnel",
        bestFor: "Spotting meaningful autonomic trends vs harmless single-day noise",
        encoding: "Shaded ±1σ normal band + 7D smooth trend line + daily reading nodes",
        pointVsTrendBehavior:
          "1-Point shows today's reading positioned on a horizontal normal-range gauge; Trend unfolds the 60-day corridor.",
      },
      {
        index: 1,
        shortTitle: "Vitals Matrix",
        title: "Concept B · 6-Vital Sparkline Telemetry Grid",
        subtitle: "High-density native status cards with 14-day micro-trends & anomaly badges",
        bestFor: "Morning 5-second health check across all physiological systems",
        encoding: "2×3 grid cards with status pill, delta vs baseline, and sparkline",
        pointVsTrendBehavior:
          "1-Point highlights today's 6 vital statuses & anomaly count; Trend adds 14D sparklines and baseline deltas inside each card.",
      },
      {
        index: 2,
        shortTitle: "Z-Score & Quadrant",
        title: "Concept C · Autonomic Balance Quadrant & Z-Score Bars",
        subtitle: "Normalized deviation bars (-2σ to +2σ) + HRV × RHR state space",
        bestFor: "Synthesizing all vitals into a single readiness state (Peak vs Sympathetic Strain)",
        encoding: "Diverging center-zero Z-score bullet bars + 2D HRV/RHR scatter plane",
        pointVsTrendBehavior:
          "1-Point places today's dot in the Autonomic Quadrant; Trend draws the 14-day trajectory tail across the quadrant.",
      },
    ],
  },
  {
    id: "sleep",
    label: "Sleep & Recovery",
    kicker: "Nightly Restorative Architecture",
    headline: "Sleep Stages, Debt & Circadian Rhythm",
    summary:
      "Evaluates both sleep quantity and restorative architecture (Deep SWS + REM share, sleep efficiency, bedtime regularity, and cumulative sleep debt).",
    sources: ["Oura", "WHOOP", "Apple Health", "Garmin", "Health Connect"],
    CombineRule:
      "Combine sleep stages into a proportional bar (1-night) or stacked column (multi-night); overlay duration against an 8h need line to reveal cumulative sleep debt.",
    concepts: [
      {
        index: 0,
        shortTitle: "Stage Ribbon",
        title: "Concept A · Nightly Architecture & Restorative Split",
        subtitle: "Proportional stage breakdown (Deep · REM · Light · Awake) & efficiency gauge",
        bestFor: "Inspecting last night's sleep quality and restorative ratio",
        encoding: "Segmented stage bar + restorative % badge + contest score comparison",
        pointVsTrendBehavior:
          "1-Point focuses on last night's stage timeline & efficiency; Trend compares stage shares across the last 14 nights.",
      },
      {
        index: 1,
        shortTitle: "Stacked Nights",
        title: "Concept B · 14-Night Stacked Architecture & Target Line",
        subtitle: "Vertical stacked stage bars against your 8.0h recovery threshold",
        bestFor: "Seeing how total sleep time and Deep/REM minutes fluctuate over weeks",
        encoding: "Stacked vertical bars (Deep/REM/Light) + dashed 8h target rule",
        pointVsTrendBehavior:
          "1-Point isolates last night vs 14D average bar; Trend renders the full 14-night stacked sequence.",
      },
      {
        index: 2,
        shortTitle: "Circadian & Debt",
        title: "Concept C · Bedtime Consistency Window & Sleep Debt Curve",
        subtitle: "Floating sleep-window bars (bedtime → wake) + rolling sleep bank",
        bestFor: "Fixing social jetlag and tracking cumulative recovery surplus/deficit",
        encoding: "Vertical floating time-window capsules + cumulative debt area chart",
        pointVsTrendBehavior:
          "1-Point shows last night's timing alignment (±min vs ideal window); Trend shows 14-night circadian drift.",
      },
    ],
  },
  {
    id: "load",
    label: "Training Load",
    kicker: "Volume, Progression & Injury Guard",
    headline: "Cumulative Pace & Acute:Chronic Workload",
    summary:
      "Balances progressive overload against overreaching using ghost burn-up trajectories, Acute (7D) vs Chronic (28D) load curves, and multi-sport volume stacks.",
    sources: ["Strava", "Garmin", "Apple Health", "Health Connect", "Manual Open"],
    CombineRule:
      "Pair Acute (7D) and Chronic (28D) load on the same axis to derive the ACWR sweet spot (0.8–1.3x); pair current period cumulative hours with prior-period ghost.",
    concepts: [
      {
        index: 0,
        shortTitle: "Ghost Burn-Up",
        title: "Concept A · Cumulative Period Burn-Up vs Past-Self Ghost",
        subtitle: "Day-by-day cumulative climb raced against last period's ghost trajectory",
        bestFor: "In-week/in-month pacing: 'Am I ahead or behind where I was last week?'",
        encoding: "Solid cumulative step-line + dashed ghost curve + delta callout",
        pointVsTrendBehavior:
          "1-Point shows today's lead/gap vs ghost at the exact same hour of the week; Trend shows full period burn-up curve.",
      },
      {
        index: 1,
        shortTitle: "ACWR Load",
        title: "Concept B · Acute:Chronic Workload Ratio (ACWR) & Sweet Spot",
        subtitle: "7-day fatigue vs 28-day fitness capacity with injury-risk corridor",
        bestFor: "Preventing burnout while building season-high volume safely",
        encoding: "Dual Acute/Chronic lines + ACWR gauge (0.8–1.3x optimal zone)",
        pointVsTrendBehavior:
          "1-Point displays the ACWR dial (e.g. 1.12x Optimal Ramp); Trend plots 42-day Acute vs Chronic load crossover.",
      },
      {
        index: 2,
        shortTitle: "Sport Stack",
        title: "Concept C · Multi-Sport Volume Stack & Intensity Density",
        subtitle: "Weekly hours partitioned by Running, Cycling, Strength & Walking",
        bestFor: "Hybrid athletes tracking cross-training balance and weekly consistency",
        encoding: "Multi-series stacked bars + 28-day intensity calendar strip",
        pointVsTrendBehavior:
          "1-Point shows this week's sport share ring; Trend shows 12-week stacked volume bars.",
      },
    ],
  },
  {
    id: "performance",
    label: "Cardio & Pace",
    kicker: "Aerobic Engine & Speed Benchmarks",
    headline: "Aerobic Efficiency, HR Zones & PR Curve",
    summary:
      "Measures true physiological adaptation—running/riding faster at a lower heart rate (Aerobic Efficiency Factor), 80/20 zone polarization, and distance PR progression.",
    sources: ["Strava GPS", "Garmin FIT", "WHOOP HR", "Apple Watch Workout"],
    CombineRule:
      "Combine Pace and Heart Rate into a single Aerobic Efficiency Index (Speed ÷ HR) to prove fitness gains even on easy days; keep HR Zones as a 100% distribution.",
    concepts: [
      {
        index: 0,
        shortTitle: "Aerobic Efficiency",
        title: "Concept A · Pace-at-HR Aerobic Efficiency Trend (EF)",
        subtitle: "Tracks output speed per heartbeat—proving your aerobic engine is growing",
        bestFor: "Seeing fitness gains during base training without needing an all-out race",
        encoding: "Aerobic Efficiency line + dual Pace & HR reference tracks",
        pointVsTrendBehavior:
          "1-Point compares latest workout's Pace-per-BPM against 90D average; Trend plots 12-week EF climb.",
      },
      {
        index: 1,
        shortTitle: "HR Polarization",
        title: "Concept B · 5-Zone HR Distribution & 80/20 Polarization",
        subtitle: "Time-in-zone breakdown comparing Aerobic Base (Z1–Z2) vs Threshold/VO2 (Z4–Z5)",
        bestFor: "Avoiding the 'gray zone' (Zone 3 trap) and keeping easy days truly easy",
        encoding: "5-zone horizontal proportional bars + 80/20 balance meter",
        pointVsTrendBehavior:
          "1-Point shows latest session's 5-zone split; Trend compares 30-day cumulative zone polarization vs 80/20 target.",
      },
      {
        index: 2,
        shortTitle: "PR & Pace Curve",
        title: "Concept C · Personal Record Staircase & Critical Pace Curve",
        subtitle: "Best times across 5K · 10K · Half · Marathon with step-down improvements",
        bestFor: "Benchmarking peak speed and race-distance readiness",
        encoding: "Step-down PR timeline + distance-vs-pace decay curve",
        pointVsTrendBehavior:
          "1-Point highlights standing PR receipt & tier percentile; Trend shows multi-attempt progression staircase.",
      },
    ],
  },
  {
    id: "combined",
    label: "Multi-Metric",
    kicker: "Cross-Category Synthesis",
    headline: "Combined vs. Isolated Data Interactions",
    summary:
      "Evaluates how different categories interact: Training Strain vs. Next-Morning Readiness, Sleep Architecture vs. Aerobic Efficiency, and 1-Point Morning Brief vs. Deep Telemetry.",
    sources: ["All Activity + Readiness Providers Combined"],
    CombineRule:
      "Combine cause-and-effect pairs (Today's Strain → Tomorrow's HRV/Readiness) using dual-encoded bar+line overlays; synthesize 3+ categories into a unified Morning Readiness Brief.",
    concepts: [
      {
        index: 0,
        shortTitle: "Strain × Recovery",
        title: "Concept A · Daily Strain Bars × Next-Morning Readiness Line",
        subtitle: "Overlays training load against overnight recovery response to reveal absorption",
        bestFor: "Understanding how hard workouts suppress HRV/Readiness and how fast you rebound",
        encoding: "Vertical strain bars + overlaid readiness curve + rebound annotations",
        pointVsTrendBehavior:
          "1-Point shows today's Strain Target given this morning's Readiness score; Trend shows 14-day Strain × Recovery interplay.",
      },
      {
        index: 1,
        shortTitle: "Sleep × Efficiency",
        title: "Concept B · Restorative Sleep vs. Next-Day Cardio Output",
        subtitle: "Correlates Deep+REM hours with next-day Aerobic Efficiency & Effort gains",
        bestFor: "Proving how sleep directly pays dividends in workout pace and lower HR",
        encoding: "Scatter/paired response chart + correlation coefficient callout",
        pointVsTrendBehavior:
          "1-Point shows today's predicted performance modifier from last night's sleep; Trend shows 12-session correlation.",
      },
      {
        index: 2,
        shortTitle: "Brief vs Lab",
        title: "Concept C · Unified Morning Brief vs. Full Telemetry Matrix",
        subtitle: "Side-by-side comparison of 1-Point synthesis vs. multi-track historical stack",
        bestFor: "Deciding what belongs on Home/Today vs. Progress/Vitals deep-dive screens",
        encoding: "Synthesized readiness triad card + synchronized 3-lane telemetry stack",
        pointVsTrendBehavior:
          "Directly contrasts the 1-Point executive summary card with the synchronized multi-series trend stack.",
      },
    ],
  },
] as const;

export interface SvgLineGeometry {
  points: Array<{ x: number; y: number; val: number }>;
  polyline: string;
  areaPath: string;
}

export function buildSvgLineGeometry(
  values: number[],
  width: number,
  height: number,
  padding = 10,
): SvgLineGeometry {
  if (values.length === 0) return { points: [], polyline: "", areaPath: "" };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const usableW = Math.max(1, width - padding * 2);
  const usableH = Math.max(1, height - padding * 2);

  const points = values.map((val, i) => {
    const x = padding + (i / Math.max(1, values.length - 1)) * usableW;
    const y = height - padding - ((val - min) / span) * usableH;
    return { x, y, val };
  });

  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const areaPath = `M ${first.x.toFixed(1)},${height} L ${polyline} L ${last.x.toFixed(1)},${height} Z`;

  return { points, polyline, areaPath };
}

export function buildSvgCorridorGeometry(
  series: Array<{ value: number; baselineLow: number; baselineHigh: number }>,
  width: number,
  height: number,
  padding = 10,
) {
  if (series.length === 0) return { linePath: "", corridorPath: "", points: [] };
  const allVals = series.flatMap((s) => [s.value, s.baselineLow, s.baselineHigh]);
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const span = Math.max(1, max - min);
  const usableW = Math.max(1, width - padding * 2);
  const usableH = Math.max(1, height - padding * 2);

  const getY = (val: number) => height - padding - ((val - min) / span) * usableH;
  const points = series.map((s, i) => {
    const x = padding + (i / Math.max(1, series.length - 1)) * usableW;
    return {
      x,
      y: getY(s.value),
      yLow: getY(s.baselineLow),
      yHigh: getY(s.baselineHigh),
      val: s.value,
    };
  });

  const linePath = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const topPts = points.map((p) => `${p.x.toFixed(1)},${p.yHigh.toFixed(1)}`).join(" L ");
  const botPts = [...points].reverse().map((p) => `${p.x.toFixed(1)},${p.yLow.toFixed(1)}`).join(" L ");
  const corridorPath = `M ${topPts} L ${botPts} Z`;

  return { linePath, corridorPath, points };
}

export interface MarketEquityPoint {
  id: string;
  label: string;
  nav: number;
  sma4: number;
  ema12: number;
  drawdownPct: number;
  dividendPts: number;
  volumeHours: number;
}

export interface MarketCandle {
  id: string;
  weekLabel: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volumeHours: number;
  dividendPts: number;
  gain: boolean;
}

export interface AssetHolding {
  sport: string;
  ticker: string;
  sharePct: number;
  hours: number;
  returnPts: number;
  yieldPerHour: number;
  colorKey: "tennis" | "teal" | "ink" | "green" | "secondary";
}

export interface VitalPoint {
  day: string;
  label: string;
  value: number;
  rolling7d: number;
  baselineLow: number;
  baselineHigh: number;
}

export type VitalId = "hrv" | "rhr" | "vo2max" | "resp" | "spo2" | "temp";

export interface VitalMetricModel {
  id: VitalId;
  name: string;
  shortName: string;
  unit: string;
  current: number;
  formattedCurrent: string;
  deltaLabel: string;
  baselineMin: number;
  baselineMax: number;
  baselineMean: number;
  zScore: number;
  status: "optimal" | "normal" | "caution";
  statusLabel: string;
  higherIsBetter: boolean;
  provider: string;
  insight: string;
  series: VitalPoint[];
}

export interface SleepNightModel {
  id: string;
  label: string;
  score: number;
  durationMin: number;
  deepMin: number;
  remMin: number;
  lightMin: number;
  awakeMin: number;
  efficiencyPct: number;
  restorativePct: number;
  /** Hours relative to midnight, e.g. -1.25 = 10:45 PM, +6.75 = 6:45 AM */
  bedtimeOffsetHr: number;
  wakeOffsetHr: number;
  debtMin: number;
}

export interface LoadBucketModel {
  id: string;
  label: string;
  acuteLoad: number;
  chronicLoad: number;
  acwr: number;
  totalHours: number;
  runningHours: number;
  cyclingHours: number;
  strengthHours: number;
  walkingHours: number;
  cumCurrentHours: number;
  cumGhostHours: number;
  cumTargetHours: number;
}

export interface PerformancePointModel {
  id: string;
  label: string;
  paceMinKm: number;
  avgHr: number;
  efficiencyFactor: number;
  vo2Max: number;
}

export interface HrZoneModel {
  zone: 1 | 2 | 3 | 4 | 5;
  name: string;
  bpmRange: string;
  sessionPct: number;
  monthPct: number;
  targetPct: number;
  minutes30d: number;
}

export interface PrCurvePoint {
  id: string;
  distanceLabel: string;
  currentFormatted: string;
  priorFormatted: string;
  deltaFormatted: string;
  paceMinKm: number;
  percentile: number;
}

export interface CombinedOverlayPoint {
  id: string;
  label: string;
  strainScore: number;
  nextDayReadiness: number;
  nextDayHrv: number;
  sleepRestorativeHr: number;
  aerobicEf: number;
  workoutNote: string;
}

export interface AnalyticsLabModel {
  scenario: AnalyticsScenarioId;
  timeLens: AnalyticsTimeLens;
  windowLabel: string;
  market: {
    tickerSymbol: string;
    currentIndex: number;
    allTimeReturnPts: number;
    allTimeReturnPct: number;
    periodReturnPts: number;
    periodReturnPct: number;
    maxDrawdownPct: number;
    sharpeEfficiency: number;
    winRatePct: number;
    goldenCrossActive: boolean;
    weeklyDividendPts: number;
    equitySeries: MarketEquityPoint[];
    candles: MarketCandle[];
    holdings: AssetHolding[];
  };
  vitals: {
    readinessComposite: number;
    autonomicStateLabel: string;
    autonomicSummary: string;
    anomalyCount: number;
    metrics: VitalMetricModel[];
    quadrantTrail: { label: string; rhrZ: number; hrvZ: number; isToday: boolean }[];
  };
  sleep: {
    lastNight: SleepNightModel;
    avgScore: number;
    avgDurationFormatted: string;
    avgRestorativePct: number;
    cumulativeDebtMin: number;
    circadianRegularityPct: number;
    contestRankLabel: string;
    nights: SleepNightModel[];
  };
  load: {
    acwrCurrent: number;
    acwrStatusLabel: string;
    acuteHours7d: number;
    chronicHours28d: number;
    ghostDeltaHours: number;
    monotonyScore: number;
    series: LoadBucketModel[];
  };
  performance: {
    efCurrent: number;
    efDeltaPct: number;
    lowAerobicSharePct: number;
    highIntensitySharePct: number;
    polarizationLabel: string;
    series: PerformancePointModel[];
    zones: HrZoneModel[];
    prCurve: PrCurvePoint[];
  };
  combined: {
    strainRecoveryCorrelation: number;
    sleepEfficiencyCorrelation: number;
    optimalStrainCeiling: number;
    coachBriefHeadline: string;
    coachBriefBody: string;
    series: CombinedOverlayPoint[];
  };
}

function sliceDailyByLens<T>(items: readonly T[], lens: AnalyticsTimeLens): T[] {
  if (items.length === 0) return [];
  if (lens === "point") return items.slice(-3);
  if (lens === "7d") return items.slice(-7);
  if (lens === "30d") return items.slice(-30);
  if (lens === "90d") return items.slice(-90);
  return [...items];
}

function sliceWeeklyByLens<T>(items: readonly T[], lens: AnalyticsTimeLens): T[] {
  if (items.length === 0) return [];
  if (lens === "point") return items.slice(-2);
  if (lens === "7d") return items.slice(-2);
  if (lens === "30d") return items.slice(-4);
  if (lens === "90d") return items.slice(-12);
  return [...items];
}

function sliceByLens<T>(items: readonly T[], lens: AnalyticsTimeLens): T[] {
  return sliceDailyByLens(items, lens);
}

export function getDomainTitle(domain?: AnalyticsDomainId | string | null): string {
  switch (domain) {
    case "market":
      return "Athlete Market";
    case "vitals":
      return "Autonomic Vitals";
    case "sleep":
      return "Sleep & Recovery";
    case "load":
      return "Workload Ratio";
    case "performance":
      return "Cardio & Pace";
    case "combined":
      return "Multi-Metric Synthesis";
    default:
      return "Athlete Telemetry";
  }
}

export function formatMinutesAsHoursMins(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function deriveScenarioFromCompeteState(
  state?: CompeteState | null,
): AnalyticsScenarioId {
  if (!state) return "peak_build";

  // 1. Sparse data check (new athlete or uncalibrated profile)
  const activities = state.activities ?? [];
  if (activities.length < 4 || !state.calibrated) {
    return "sparse_new";
  }

  // 2. Overreaching check: suppressed recovery or severe ACWR fatigue spike
  const recentReadiness = (state.readiness ?? []).slice(-4);
  const lowReadiness =
    recentReadiness.length >= 2 &&
    recentReadiness.every((r) => r.score < 62);

  const recentSleep = (state.sleepNights ?? []).slice(-4);
  const lowSleep =
    recentSleep.length >= 2 &&
    recentSleep.every((s) => s.score < 62);

  if (lowReadiness && lowSleep) {
    return "overreaching";
  }

  // Compute 7-day Acute vs 28-day Chronic workload
  if (activities.length >= 7) {
    const refTime = state.demoNow ? new Date(state.demoNow).getTime() : Date.now();
    const ms7d = 7 * 86_400_000;
    const ms28d = 28 * 86_400_000;

    let acuteSec = 0;
    let chronicSec = 0;
    for (const act of activities) {
      const actTime = new Date(act.startedAt).getTime();
      const age = refTime - actTime;
      if (age >= 0 && age <= ms7d) {
        acuteSec += act.movingSec;
      }
      if (age >= 0 && age <= ms28d) {
        chronicSec += act.movingSec;
      }
    }

    const weeklyChronicSec = chronicSec / 4;
    if (weeklyChronicSec > 0) {
      const acwr = acuteSec / weeklyChronicSec;
      if (acwr > 1.35 || (acwr > 1.25 && (lowReadiness || lowSleep))) {
        return "overreaching";
      }
    }
  }

  return "peak_build";
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function formatDayLabel(key: string): string {
  const parts = key.split("-");
  const monthIdx = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  return `${MONTH_NAMES[monthIdx] ?? "Oct"} ${day}`;
}

export function buildAnalyticsLabModel(
  scenarioOrState: AnalyticsScenarioId | CompeteState | null = "peak_build",
  timeLens: AnalyticsTimeLens = "30d",
): AnalyticsLabModel {
  const state =
    typeof scenarioOrState === "object" && scenarioOrState !== null
      ? scenarioOrState
      : null;
  const scenario: AnalyticsScenarioId = state
    ? deriveScenarioFromCompeteState(state)
    : typeof scenarioOrState === "string"
      ? scenarioOrState
      : "peak_build";

  const isOver = scenario === "overreaching";
  const isSparse = scenario === "sparse_new";
  const totalPoints = isSparse
    ? timeLens === "7d"
      ? 4
      : 8
    : timeLens === "90d" || timeLens === "all"
      ? 90
      : timeLens === "7d"
        ? 7
        : 30;

  const anchor = state?.demoNow
    ? new Date(state.demoNow)
    : new Date("2026-10-25T12:00:00Z");

  const dayKeys = Array.from({ length: totalPoints }, (_, i) => {
    const d = shiftAppDay(anchor, i - (totalPoints - 1));
    return dayKey(d, APP_TIMEZONE);
  });
  const dayLabels = dayKeys.map(formatDayLabel);

  const weekLabels = Array.from({ length: 14 }, (_, i) => {
    const d = shiftAppDay(anchor, (i - 13) * 7);
    return formatDayLabel(dayKey(d, APP_TIMEZONE));
  });

  // 1. Build Market Series & Candlesticks
  const baseNav = 1000;
  let runningNav = baseNav;
  let peakNav = baseNav;
  const rawEquity: MarketEquityPoint[] = [];
  const rawCandles: MarketCandle[] = [];

  for (let i = 0; i < totalPoints; i += 1) {
    const noise = (unitInterval(`mkt:${scenario}:${i}`) - 0.38) * 28;
    const trendStep = isOver
      ? i < 9
        ? 38
        : -22
      : isSparse
        ? 18
        : 28 + Math.sin(i * 0.55) * 14;
    const open = Math.round(runningNav);
    const dividendPts = Math.max(2, Math.round(6 + unitInterval(`div:${i}`) * 10));
    const close = Math.round(clamp(880, 2200, open + trendStep + noise));
    const high = Math.max(open, close) + Math.round(8 + unitInterval(`hi:${i}`) * 18);
    const low = Math.min(open, close) - Math.round(4 + unitInterval(`lo:${i}`) * 14);
    const volumeHours = Number(
      clamp(2.2, 14.5, 5.8 + (i * 0.35) + (isOver && i > 8 ? 3.8 : 0)).toFixed(1),
    );

    runningNav = close;
    peakNav = Math.max(peakNav, high);
    const drawdownPct = Number((((close - peakNav) / peakNav) * 100).toFixed(1));

    const prev3 = rawEquity.slice(-3).map((p) => p.nav);
    const sma4 = Math.round(
      ([...prev3, close].reduce((a, b) => a + b, 0)) / (prev3.length + 1),
    );
    const prevEma = rawEquity.at(-1)?.ema12 ?? baseNav;
    const ema12 = Math.round(prevEma * 0.78 + close * 0.22);

    rawEquity.push({
      id: `eq-${i}`,
      label: weekLabels[i]!,
      nav: close,
      sma4,
      ema12,
      drawdownPct,
      dividendPts,
      volumeHours,
    });

    rawCandles.push({
      id: `cd-${i}`,
      weekLabel: weekLabels[i]!,
      open,
      high,
      low,
      close,
      volumeHours,
      dividendPts,
      gain: close >= open,
    });
  }

  const equitySeries = sliceByLens(rawEquity, timeLens);
  const candles = sliceByLens(rawCandles, timeLens);
  const currentIndex = rawEquity.at(-1)?.nav ?? 1000;
  const startWindowNav = equitySeries[0]?.nav ?? baseNav;
  const allTimeReturnPts = currentIndex - baseNav;
  const allTimeReturnPct = Number(((allTimeReturnPts / baseNav) * 100).toFixed(1));
  const periodReturnPts = currentIndex - startWindowNav;
  const periodReturnPct = Number(
    ((periodReturnPts / Math.max(1, startWindowNav)) * 100).toFixed(1),
  );
  const maxDrawdownPct = Math.min(0, ...rawEquity.map((e) => e.drawdownPct));
  const winCount = rawCandles.filter((c) => c.gain).length;
  const winRatePct = Math.round((winCount / Math.max(1, rawCandles.length)) * 100);
  const lastEq = rawEquity.at(-1)!;
  const goldenCrossActive = lastEq.sma4 >= lastEq.ema12;

  let runSec = 0;
  let cycSec = 0;
  let strSec = 0;
  let otherSec = 0;
  if (state?.activities && state.activities.length > 0) {
    for (const act of state.activities) {
      if (act.sport === "running") runSec += act.movingSec;
      else if (act.sport === "cycling") cycSec += act.movingSec;
      else if (act.sport === "strength") strSec += act.movingSec;
      else otherSec += act.movingSec;
    }
  }
  const totalActSec = runSec + cycSec + strSec + otherSec;
  const hasRealActivities = totalActSec > 0;

  const runHours = hasRealActivities ? Number((runSec / 3600).toFixed(1)) : (isSparse ? 3.2 : 42.5);
  const cycHours = hasRealActivities ? Number((cycSec / 3600).toFixed(1)) : (isSparse ? 1.8 : 22.0);
  const strHours = hasRealActivities ? Number((strSec / 3600).toFixed(1)) : (isSparse ? 1.5 : 16.4);
  const sleepHours = isSparse ? 21.0 : 98.0;

  const totalAllHours = runHours + cycHours + strHours + sleepHours;
  const runShare = Math.round((runHours / Math.max(1, totalAllHours)) * 100);
  const cycShare = Math.round((cycHours / Math.max(1, totalAllHours)) * 100);
  const strShare = Math.round((strHours / Math.max(1, totalAllHours)) * 100);
  const slpShare = Math.max(5, 100 - runShare - cycShare - strShare);

  const holdings: AssetHolding[] = [
    {
      sport: "Running (GPS)",
      ticker: "RUN",
      sharePct: runShare,
      hours: runHours,
      returnPts: Math.round(allTimeReturnPts * (runShare / 100)),
      yieldPerHour: 4.8,
      colorKey: "teal",
    },
    {
      sport: "Cycling (GPS)",
      ticker: "CYC",
      sharePct: cycShare,
      hours: cycHours,
      returnPts: Math.round(allTimeReturnPts * (cycShare / 100)),
      yieldPerHour: 4.1,
      colorKey: "tennis",
    },
    {
      sport: "Strength (Open)",
      ticker: "STR",
      sharePct: strShare,
      hours: strHours,
      returnPts: Math.round(allTimeReturnPts * (strShare / 100)),
      yieldPerHour: 4.9,
      colorKey: "ink",
    },
    {
      sport: "Sleep & Recovery",
      ticker: "SLP",
      sharePct: slpShare,
      hours: sleepHours,
      returnPts: Math.round(allTimeReturnPts * (slpShare / 100)),
      yieldPerHour: 1.9,
      colorKey: "green",
    },
  ];

  // 2. Build Vitals & Autonomic Monitoring
  function makeVitalSeries(
    key: string,
    baseMean: number,
    baseHalfBand: number,
    trendSlope: number,
    overreachShift: number,
    decimals = 0,
  ): VitalPoint[] {
    const pts: VitalPoint[] = [];
    for (let i = 0; i < totalPoints; i += 1) {
      const n = (unitInterval(`vital:${key}:${i}`) - 0.5) * baseHalfBand * 1.4;
      const lateShift = isOver && i >= totalPoints - 5 ? overreachShift : trendSlope * i;
      const rawVal = baseMean + lateShift + n;
      const value = Number(rawVal.toFixed(decimals));
      const recent = [...pts.slice(-6).map((p) => p.value), value];
      const rolling7d = Number(
        (recent.reduce((a, b) => a + b, 0) / recent.length).toFixed(decimals),
      );
      pts.push({
        day: dayKeys[i]!,
        label: dayLabels[i]!,
        value,
        rolling7d,
        baselineLow: Number((baseMean - baseHalfBand).toFixed(decimals)),
        baselineHigh: Number((baseMean + baseHalfBand).toFixed(decimals)),
      });
    }
    return sliceByLens(pts, timeLens);
  }

  const hrvSeries = makeVitalSeries("hrv", 72, 10, 0.8, -19, 0);
  const rhrSeries = makeVitalSeries("rhr", 51, 3, -0.25, +6, 0);
  const vo2Series = makeVitalSeries("vo2", 54.2, 1.5, 0.18, -0.4, 1);
  const respSeries = makeVitalSeries("resp", 14.4, 0.7, -0.02, +1.4, 1);
  const spo2Series = makeVitalSeries("spo2", 97.6, 1.0, 0.03, -1.2, 1);
  const tempSeries = makeVitalSeries("temp", 0.0, 0.25, 0.0, +0.48, 2);

  const hrvNow = hrvSeries.at(-1)?.value ?? 72;
  const rhrNow = rhrSeries.at(-1)?.value ?? 51;
  const vo2Now = vo2Series.at(-1)?.value ?? 54.2;
  const respNow = respSeries.at(-1)?.value ?? 14.4;
  const spo2Now = spo2Series.at(-1)?.value ?? 97.6;
  const tempNow = tempSeries.at(-1)?.value ?? 0.0;

  const vitalsList: VitalMetricModel[] = [
    {
      id: "hrv",
      name: "Heart Rate Variability",
      shortName: "HRV (rMSSD)",
      unit: "ms",
      current: hrvNow,
      formattedCurrent: `${hrvNow} ms`,
      deltaLabel: `${hrvNow >= 72 ? "+" : ""}${hrvNow - 72} ms vs 60D mean`,
      baselineMin: 62,
      baselineMax: 82,
      baselineMean: 72,
      zScore: Number(((hrvNow - 72) / 10).toFixed(2)),
      status: hrvNow < 62 ? "caution" : hrvNow > 78 ? "optimal" : "normal",
      statusLabel: hrvNow < 62 ? "Suppressed" : hrvNow > 78 ? "Peak" : "Baseline",
      higherIsBetter: true,
      provider: "WHOOP · Oura",
      insight:
        hrvNow < 62
          ? "Parasympathetic tone is suppressed below your 62–82 ms corridor—prioritize Zone 1/2 or rest."
          : "HRV sits comfortably inside your upper baseline tunnel, signaling strong autonomic recovery.",
      series: hrvSeries,
    },
    {
      id: "rhr",
      name: "Resting Heart Rate",
      shortName: "Resting HR",
      unit: "bpm",
      current: rhrNow,
      formattedCurrent: `${rhrNow} bpm`,
      deltaLabel: `${rhrNow >= 51 ? "+" : ""}${rhrNow - 51} bpm vs 60D mean`,
      baselineMin: 48,
      baselineMax: 54,
      baselineMean: 51,
      zScore: Number(((51 - rhrNow) / 3).toFixed(2)), // inverted so positive Z = healthier/lower RHR
      status: rhrNow > 54 ? "caution" : rhrNow <= 49 ? "optimal" : "normal",
      statusLabel: rhrNow > 54 ? "Elevated" : rhrNow <= 49 ? "Athletic Low" : "Baseline",
      higherIsBetter: false,
      provider: "Garmin · Apple Health",
      insight:
        rhrNow > 54
          ? "Overnight RHR is +5 bpm above baseline, typical after late threshold sessions or dehydration."
          : "Stroke volume adaptation keeps overnight resting heart rate anchored near 49–51 bpm.",
      series: rhrSeries,
    },
    {
      id: "vo2max",
      name: "VO2 Max Fitness",
      shortName: "VO2 Max",
      unit: "mL/kg",
      current: vo2Now,
      formattedCurrent: `${vo2Now.toFixed(1)}`,
      deltaLabel: `${vo2Now >= 54.2 ? "+" : ""}${(vo2Now - 54.2).toFixed(1)} vs 60D`,
      baselineMin: 52.7,
      baselineMax: 55.7,
      baselineMean: 54.2,
      zScore: Number(((vo2Now - 54.2) / 1.5).toFixed(2)),
      status: vo2Now >= 55.0 ? "optimal" : "normal",
      statusLabel: vo2Now >= 55.0 ? "Top 5% Tier" : "Steady",
      higherIsBetter: true,
      provider: "Garmin · Apple Watch",
      insight:
        "Submaximal pace-to-HR ratio indicates a steady climb in aerobic ceiling over this block.",
      series: vo2Series,
    },
    {
      id: "resp",
      name: "Respiratory Rate",
      shortName: "Resp Rate",
      unit: "brpm",
      current: respNow,
      formattedCurrent: `${respNow.toFixed(1)} brpm`,
      deltaLabel: `${respNow >= 14.4 ? "+" : ""}${(respNow - 14.4).toFixed(1)} vs 60D`,
      baselineMin: 13.7,
      baselineMax: 15.1,
      baselineMean: 14.4,
      zScore: Number(((14.4 - respNow) / 0.7).toFixed(2)),
      status: respNow > 15.2 ? "caution" : "normal",
      statusLabel: respNow > 15.2 ? "Elevated" : "Stable",
      higherIsBetter: false,
      provider: "WHOOP · Oura",
      insight:
        respNow > 15.2
          ? "Sleeping ventilation rate ticked above 15.1 brpm—watch for systemic fatigue or airway strain."
          : "Minute ventilation is remarkably steady, confirming low overnight metabolic stress.",
      series: respSeries,
    },
    {
      id: "spo2",
      name: "Blood Oxygen",
      shortName: "SpO2",
      unit: "%",
      current: spo2Now,
      formattedCurrent: `${spo2Now.toFixed(1)}%`,
      deltaLabel: "96.6–98.6% corridor",
      baselineMin: 96.6,
      baselineMax: 98.6,
      baselineMean: 97.6,
      zScore: Number(((spo2Now - 97.6) / 1.0).toFixed(2)),
      status: spo2Now < 96.2 ? "caution" : "optimal",
      statusLabel: spo2Now < 96.2 ? "Dip Noted" : "Optimal",
      higherIsBetter: true,
      provider: "Oura · Apple Health",
      insight: "Peripheral oxygen saturation remains above 97% throughout REM and Deep stages.",
      series: spo2Series,
    },
    {
      id: "temp",
      name: "Skin Temp Deviation",
      shortName: "Wrist Temp",
      unit: "°C",
      current: tempNow,
      formattedCurrent: `${tempNow >= 0 ? "+" : ""}${tempNow.toFixed(2)}°C`,
      deltaLabel: "vs 60D nocturnal baseline",
      baselineMin: -0.25,
      baselineMax: 0.25,
      baselineMean: 0,
      zScore: Number(((-Math.abs(tempNow) + 0.15) / 0.25).toFixed(2)),
      status: Math.abs(tempNow) > 0.35 ? "caution" : "normal",
      statusLabel: Math.abs(tempNow) > 0.35 ? "+0.4°C Shift" : "Aligned",
      higherIsBetter: false,
      provider: "Oura · Apple Watch",
      insight:
        Math.abs(tempNow) > 0.35
          ? "Nocturnal skin temperature rose above your ±0.25°C thermal envelope."
          : "Core-to-shell thermoregulation is tightly aligned with your circadian trough.",
      series: tempSeries,
    },
  ];

  const anomalyCount = vitalsList.filter((v) => v.status === "caution").length;
  const readinessComposite = isOver ? 54 : isSparse ? 79 : 88;
  const quadrantTrail = hrvSeries.map((pt, idx) => {
    const rhrPt = rhrSeries[idx] ?? rhrSeries.at(-1)!;
    return {
      label: pt.label,
      hrvZ: Number(((pt.value - 72) / 10).toFixed(2)),
      rhrZ: Number(((51 - rhrPt.value) / 3).toFixed(2)),
      isToday: idx === hrvSeries.length - 1,
    };
  });

  // 3. Build Sleep & Nightly Architecture
  const rawNights: SleepNightModel[] = [];
  let runningDebt = isOver ? 95 : 15;
  for (let i = 0; i < totalPoints; i += 1) {
    const u = unitInterval(`slp:${scenario}:${i}`);
    const durationMin = Math.round(
      isOver && i >= totalPoints - 4
        ? 375 + u * 45
        : 445 + u * 65,
    );
    const deepMin = Math.round(durationMin * (isOver ? 0.15 : 0.21 + (u - 0.5) * 0.04));
    const remMin = Math.round(durationMin * (isOver ? 0.18 : 0.24 + (0.5 - u) * 0.04));
    const awakeMin = Math.round(isOver ? 34 + u * 18 : 16 + u * 14);
    const lightMin = Math.max(60, durationMin - deepMin - remMin - awakeMin);
    const efficiencyPct = Math.round(((durationMin - awakeMin) / durationMin) * 100);
    const restorativePct = Math.round(((deepMin + remMin) / durationMin) * 100);
    const score = clamp(
      48,
      98,
      Math.round(restorativePct * 1.1 + efficiencyPct * 0.42 - (480 - durationMin) * 0.08),
    );
    const bedtimeOffsetHr = Number(
      ((isOver ? -0.2 : -1.1) + (u - 0.5) * 0.9).toFixed(2),
    );
    const wakeOffsetHr = Number((bedtimeOffsetHr + durationMin / 60).toFixed(2));
    runningDebt = clamp(
      -60,
      240,
      Math.round(runningDebt + (480 - durationMin) * 0.65),
    );

    rawNights.push({
      id: `night-${i}`,
      label: dayLabels[i]!,
      score,
      durationMin,
      deepMin,
      remMin,
      lightMin,
      awakeMin,
      efficiencyPct,
      restorativePct,
      bedtimeOffsetHr,
      wakeOffsetHr,
      debtMin: runningDebt,
    });
  }

  const nights = sliceByLens(rawNights, timeLens);
  const lastNight = rawNights.at(-1)!;
  const avgScore = Math.round(
    nights.reduce((s, n) => s + n.score, 0) / Math.max(1, nights.length),
  );
  const avgDurationMin = Math.round(
    nights.reduce((s, n) => s + n.durationMin, 0) / Math.max(1, nights.length),
  );
  const avgRestorativePct = Math.round(
    nights.reduce((s, n) => s + n.restorativePct, 0) / Math.max(1, nights.length),
  );

  // 4. Build Training Load, ACWR & Burn-Up
  const rawLoad: LoadBucketModel[] = [];
  let cumCurr = 0;
  let cumGhost = 0;
  for (let i = 0; i < totalPoints; i += 1) {
    const u = unitInterval(`load:${scenario}:${i}`);
    const runningHours = Number((1.4 + u * 2.1 + (isOver && i > 8 ? 1.4 : 0)).toFixed(1));
    const cyclingHours = Number((0.8 + (1 - u) * 1.6).toFixed(1));
    const strengthHours = Number((0.6 + u * 0.9).toFixed(1));
    const walkingHours = Number((0.4 + u * 0.6).toFixed(1));
    const totalHours = Number(
      (runningHours + cyclingHours + strengthHours + walkingHours).toFixed(1),
    );
    const ghostStep = Number((totalHours * (isOver ? 0.82 : 0.89)).toFixed(1));
    cumCurr = Number((cumCurr + totalHours).toFixed(1));
    cumGhost = Number((cumGhost + ghostStep).toFixed(1));
    const cumTargetHours = Number(((i + 1) * 5.2).toFixed(1));

    const chronicLoad = Math.round(48 + i * 1.8);
    const acuteLoad = Math.round(
      chronicLoad * (isOver && i >= totalPoints - 4 ? 1.46 : 1.08 + (u - 0.45) * 0.22),
    );
    const acwr = Number((acuteLoad / Math.max(1, chronicLoad)).toFixed(2));

    rawLoad.push({
      id: `ld-${i}`,
      label: dayLabels[i]!,
      acuteLoad,
      chronicLoad,
      acwr,
      totalHours,
      runningHours,
      cyclingHours,
      strengthHours,
      walkingHours,
      cumCurrentHours: cumCurr,
      cumGhostHours: cumGhost,
      cumTargetHours,
    });
  }

  const loadSeries = sliceByLens(rawLoad, timeLens);
  const latestLoad = rawLoad.at(-1)!;
  const acwrCurrent = latestLoad.acwr;
  const acwrStatusLabel =
    acwrCurrent > 1.35
      ? "Overreaching (>1.3x)"
      : acwrCurrent >= 0.85
        ? "Sweet Spot (0.8–1.3x)"
        : "Under-loaded (<0.8x)";

  // 5. Build Cardio Performance, Aerobic Efficiency & HR Zones
  const rawPerf: PerformancePointModel[] = [];
  const totalWeeks = weekLabels.length;
  for (let i = 0; i < totalWeeks; i += 1) {
    const progress = i / Math.max(1, totalWeeks - 1);
    const paceMinKm = Number(
      (5.15 - progress * (isOver ? 0.12 : 0.38) + (isOver && i > 9 ? 0.18 : 0)).toFixed(2),
    );
    const avgHr = Math.round(
      149 - progress * (isOver ? -4 : 5) + (unitInterval(`hr:${i}`) - 0.5) * 4,
    );
    const speedMPerMin = 1000 / paceMinKm;
    const efficiencyFactor = Number((speedMPerMin / avgHr).toFixed(2));
    const vo2Max = Number((52.8 + progress * 2.4).toFixed(1));
    rawPerf.push({
      id: `pf-${i}`,
      label: weekLabels[i]!,
      paceMinKm,
      avgHr,
      efficiencyFactor,
      vo2Max,
    });
  }
  const perfSeries = sliceWeeklyByLens(rawPerf, timeLens);
  const efCurrent = rawPerf.at(-1)?.efficiencyFactor ?? 1.35;
  const efStart = rawPerf[0]?.efficiencyFactor ?? 1.25;
  const efDeltaPct = Number((((efCurrent - efStart) / efStart) * 100).toFixed(1));

  const zones: HrZoneModel[] = [
    {
      zone: 1,
      name: "Z1 · Recovery",
      bpmRange: "108–126 bpm",
      sessionPct: 18,
      monthPct: isOver ? 12 : 24,
      targetPct: 22,
      minutes30d: 265,
    },
    {
      zone: 2,
      name: "Z2 · Aerobic Base",
      bpmRange: "127–145 bpm",
      sessionPct: 58,
      monthPct: isOver ? 42 : 56,
      targetPct: 58,
      minutes30d: 620,
    },
    {
      zone: 3,
      name: "Z3 · Tempo (Gray)",
      bpmRange: "146–160 bpm",
      sessionPct: 12,
      monthPct: isOver ? 24 : 7,
      targetPct: 6,
      minutes30d: 85,
    },
    {
      zone: 4,
      name: "Z4 · Threshold",
      bpmRange: "161–174 bpm",
      sessionPct: 9,
      monthPct: isOver ? 15 : 9,
      targetPct: 10,
      minutes30d: 102,
    },
    {
      zone: 5,
      name: "Z5 · VO2 Anaerobic",
      bpmRange: "175+ bpm",
      sessionPct: 3,
      monthPct: isOver ? 7 : 4,
      targetPct: 4,
      minutes30d: 44,
    },
  ];

  const lowAerobicSharePct = zones[0]!.monthPct + zones[1]!.monthPct;
  const highIntensitySharePct = zones[3]!.monthPct + zones[4]!.monthPct;

  const prCurve: PrCurvePoint[] = [
    {
      id: "pr-5k",
      distanceLabel: "5K Run",
      currentFormatted: "19:42",
      priorFormatted: "20:38",
      deltaFormatted: "-0:56",
      paceMinKm: 3.94,
      percentile: 88,
    },
    {
      id: "pr-10k",
      distanceLabel: "10K Run",
      currentFormatted: "41:15",
      priorFormatted: "42:50",
      deltaFormatted: "-1:35",
      paceMinKm: 4.12,
      percentile: 85,
    },
    {
      id: "pr-half",
      distanceLabel: "Half Marathon",
      currentFormatted: "1:31:20",
      priorFormatted: "1:34:45",
      deltaFormatted: "-3:25",
      paceMinKm: 4.33,
      percentile: 83,
    },
    {
      id: "pr-full",
      distanceLabel: "Marathon",
      currentFormatted: "3:14:10",
      priorFormatted: "3:21:05",
      deltaFormatted: "-6:55",
      paceMinKm: 4.6,
      percentile: 81,
    },
  ];

  // 6. Build Combined Multi-Variate Synthesis
  const rawCombined: CombinedOverlayPoint[] = [];
  for (let i = 0; i < totalPoints; i += 1) {
    const ld = rawLoad[i]!;
    const vt = hrvSeries[Math.min(i, hrvSeries.length - 1)]!;
    const sl = rawNights[i]!;
    const pf = rawPerf[Math.min(i, rawPerf.length - 1)]!;
    const strainScore = clamp(
      6,
      20.5,
      Number((ld.totalHours * 2.1 + (i % 3 === 0 ? 3.2 : 0)).toFixed(1)),
    );
    const nextDayReadiness = clamp(
      38,
      96,
      Math.round(100 - strainScore * (isOver ? 2.6 : 1.7) + (sl.restorativePct - 35) * 0.9),
    );
    rawCombined.push({
      id: `cmb-${i}`,
      label: dayLabels[i]!,
      strainScore,
      nextDayReadiness,
      nextDayHrv: vt.value,
      sleepRestorativeHr: Number(((sl.deepMin + sl.remMin) / 60).toFixed(2)),
      aerobicEf: pf.efficiencyFactor,
      workoutNote:
        strainScore > 16
          ? "Key Threshold Block"
          : strainScore > 12
            ? "Aerobic Base Build"
            : "Recovery / Mobility",
    });
  }

  const windowLabelMap: Record<AnalyticsTimeLens, string> = {
    point: "1-Point Snapshot (Today / Latest)",
    "7d": "Last 7 Days · Micro-Trend",
    "30d": "Last 30 Days · Mesocycle",
    "90d": "Last 90 Days · Season Block",
    all: "All-Time Athlete History",
  };

  return {
    scenario,
    timeLens,
    windowLabel: windowLabelMap[timeLens],
    market: {
      tickerSymbol: "$ATHL",
      currentIndex,
      allTimeReturnPts,
      allTimeReturnPct,
      periodReturnPts,
      periodReturnPct,
      maxDrawdownPct,
      sharpeEfficiency: isOver ? 1.18 : 2.14,
      winRatePct,
      goldenCrossActive,
      weeklyDividendPts: lastEq.dividendPts,
      equitySeries,
      candles,
      holdings,
    },
    vitals: {
      readinessComposite,
      autonomicStateLabel:
        anomalyCount >= 2
          ? "Sympathetic Strain · Deload Advised"
          : readinessComposite >= 82
            ? "Parasympathetic Peak · Green to Push"
            : "Balanced Baseline · Steady Build",
      autonomicSummary:
        anomalyCount >= 2
          ? `${anomalyCount} vitals sit outside your 60-day normal corridor (HRV depressed, RHR elevated). Keep effort in Zone 1–2 today.`
          : "All 6 overnight vitals track inside your 60-day personal corridor. High capacity for threshold or race-pace work.",
      anomalyCount,
      metrics: vitalsList,
      quadrantTrail,
    },
    sleep: {
      lastNight,
      avgScore,
      avgDurationFormatted: formatMinutesAsHoursMins(avgDurationMin),
      avgRestorativePct,
      cumulativeDebtMin: lastNight.debtMin,
      circadianRegularityPct: isOver ? 74 : 91,
      contestRankLabel: isOver ? "4th / 8 · Sleep Field" : "1st / 8 · Sleep Field",
      nights,
    },
    load: {
      acwrCurrent,
      acwrStatusLabel,
      acuteHours7d: latestLoad.totalHours,
      chronicHours28d: Number((latestLoad.totalHours / Math.max(0.5, acwrCurrent)).toFixed(1)),
      ghostDeltaHours: Number(
        (latestLoad.cumCurrentHours - latestLoad.cumGhostHours).toFixed(1),
      ),
      monotonyScore: isOver ? 2.15 : 1.32,
      series: loadSeries,
    },
    performance: {
      efCurrent,
      efDeltaPct,
      lowAerobicSharePct,
      highIntensitySharePct,
      polarizationLabel:
        lowAerobicSharePct >= 75
          ? `80/20 Polarized (${lowAerobicSharePct}% Base / ${highIntensitySharePct}% Peak)`
          : `Threshold Heavy (${lowAerobicSharePct}% Base / ${zones[2]!.monthPct}% Gray Zone)`,
      series: perfSeries,
      zones,
      prCurve,
    },
    combined: {
      strainRecoveryCorrelation: -0.78,
      sleepEfficiencyCorrelation: 0.72,
      optimalStrainCeiling: isOver ? 11.5 : 16.4,
      coachBriefHeadline:
        isOver
          ? "Hold High Intensity · Recover 35m Sleep Debt"
          : "Green Light · +8.4% Aerobic Efficiency Gain",
      coachBriefBody:
        isOver
          ? "Your 7-day Acute Load (1.46x ACWR) outpaced overnight HRV recovery. A 45-min Zone 1 spin or walk protects your Effort Score streak without deepening fatigue."
          : "Last night's 3h 38m of Deep+REM sleep restored HRV to 81 ms (+9 ms above mean). Ideal window to chase +1 Effort dividends or a 10K threshold effort.",
      series: sliceByLens(rawCombined, timeLens),
    },
  };
}
