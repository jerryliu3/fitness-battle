import { arenaBaselineStorageKey, serializeArenaBaseline } from "../arena-view";
import { DEFAULT_SAMPLE_ROUTE, SAMPLE_ROUTES } from "../sampleRoute";
import { APP_TIMEZONE } from "../period";
import { waveWindowAt } from "../matching/waves";
import { buildArenaModel, competePeriodWindow } from "../phone-views";
import { competeNow, freshState, reduceCompete } from "./engine";
import { countsOnTrack } from "./ledger";
import {
  competitionTrack,
  dayKey,
  sportById,
  type Activity,
  type CompeteState,
  type ScoreTrack,
  type SportId,
} from "./sports";

export type DebugEventId = "sync-activity" | "sync-combo" | "overtake" | "overtake-combo" | "overtaken" | "week-closing";

export interface DebugEventOption {
  id: DebugEventId;
  label: string;
  detail: string;
}

export const DEBUG_EVENT_OPTIONS: readonly DebugEventOption[] = [
  { id: "sync-activity", label: "Sync · no overtakes", detail: "Review activities and maps, swipe, then return" },
  { id: "sync-combo", label: "Sync → photo finish + combo", detail: "Review multiple activities, then pass several rivals" },
  { id: "overtake", label: "Overtake someone", detail: "Open the full-screen photo finish" },
  { id: "overtake-combo", label: "Overtake several rivals", detail: "Watch each pass build the full-screen combo" },
  { id: "overtaken", label: "Get overtaken", detail: "Watch a rival pass you in your Arena lane" },
  { id: "week-closing", label: "Week closing", detail: "Settle the week & open the round recap" },
];

export interface DebugEventResult {
  event: DebugEventId;
  state: CompeteState;
  baselines: Record<string, string>;
  targetRoute: "/today" | "/arena" | "/arena?results=latest";
  revealStopKey?: string;
}

function makeDebugActivity(
  sport: SportId,
  displayValue: number,
  units: CompeteState["units"],
  startedAt: Date,
  id: string,
): Activity {
  const gps = sportById(sport).gps;
  const safe = Math.max(0.1, displayValue);
  const distanceM = gps ? Math.max(100, Math.round(safe * (units === "metric" ? 1000 : 1609.344))) : 0;
  const movingSec = gps
    ? Math.max(120, Math.round(distanceM * (sport === "cycling" ? 0.16 : sport === "walking" ? 0.72 : 0.34)))
    : Math.max(60, Math.round(safe * 450));
  return {
    id,
    sport,
    startedAt: startedAt.toISOString(),
    distanceM,
    movingSec,
    avgHr: gps ? 148 : null,
    verified: gps,
    source: gps ? "strava" : "manual",
    provenance: "recorded",
    disposition: "counted",
    ...(gps ? { summaryPolyline: DEFAULT_SAMPLE_ROUTE.summaryPolyline, detailedPolyline: DEFAULT_SAMPLE_ROUTE.summaryPolyline, elevationGainM: DEFAULT_SAMPLE_ROUTE.elevationGainM } : {}),
  };
}

export function applyDebugEvent(
  inputState: CompeteState,
  event: DebugEventId,
  accountKey = "guest",
  stepIndex = 1,
): DebugEventResult {
  const now = competeNow(inputState);
  const sport: SportId =
    inputState.ratings.find((r) => r.sport === inputState.primary && r.optedIn)?.sport ??
    inputState.ratings.find((r) => r.optedIn)?.sport ??
    inputState.primary;

  // UI testing must work even in an empty, real or unusually seeded field.
  let base: CompeteState = { ...freshState(now), name: inputState.name, avatarUrl: inputState.avatarUrl,
    units: inputState.units, onboardingCompleted: true, primary: sport, demoNow: now.toISOString() };
  if (!base.ratings.find((r) => r.sport === sport)?.optedIn || !base.enrollments.some((e) => e.sport === sport)) {
    base = reduceCompete(base, { type: "opt-in", sport, accountId: accountKey, now: now.toISOString() });
    // UI previews explicitly use an already-open fixture window. They never
    // queue a real registration or write this simulated field to the account.
    const window = waveWindowAt(now);
    base = { ...base, clock: { ...base.clock, periodStart: window.waveStart.toISOString() },
      enrollments: base.enrollments.map(e => ({ ...e, waveStart: window.waveStart.toISOString(), weekEnd: window.weekEnd.toISOString() })),
      ratings: base.ratings.map(r => r.sport === sport ? { ...r, lockPeriod: window.waveStart.toISOString() } : r) };
  }

  const period = competePeriodWindow(base, now, sport);
  const periodStartIso = period.startsAt.toISOString();
  const gps = sportById(sport).gps;
  const stepUnit = gps ? 1 : 10;
  const jitter = ((stepIndex % 7) + 1) * 0.031 * stepUnit;
  const baselines: Record<string, string> = {};

  if (event === "overtake-combo" || event === "sync-combo") {
    const single = applyDebugEvent(base, "overtake", accountKey, stepIndex);
    const arena = buildArenaModel(single.state, now, competitionTrack(sport), sport);
    const rivals = arena.lanes.filter(l => !l.you && !l.ghost).sort((a, b) => a.values[2] - b.values[2]);
    // Early in the week several synthetics are still at zero. Aim past the third rival who has actually moved.
    const racing = rivals.filter(l => l.values[2] > stepUnit * 0.05);
    const pool = racing.length >= 2 ? racing : rivals;
    const target = (pool[Math.min(2, pool.length - 1)]?.values[2] ?? 5 * stepUnit) + stepUnit;
    const activity = makeDebugActivity(sport, target, base.units, new Date(now.getTime() - 1000), `debug-combo-${stepIndex}-${now.getTime()}`);
    const kept = single.state.activities.filter(a => a.sport !== sport || Date.parse(a.startedAt) < period.startsAt.getTime() || Date.parse(a.startedAt) >= period.endsAt.getTime());
    const activities = event === "sync-combo" ? [
      { ...activity, id: `${activity.id}-1`, distanceM: Math.round(activity.distanceM * .6), movingSec: Math.round(activity.movingSec * .6) },
      { ...activity, id: `${activity.id}-2`, startedAt: new Date(now.getTime() - 3600_000).toISOString(), distanceM: activity.distanceM - Math.round(activity.distanceM * .6), movingSec: activity.movingSec - Math.round(activity.movingSec * .6), ...(gps ? { summaryPolyline: SAMPLE_ROUTES[1].summaryPolyline, detailedPolyline: SAMPLE_ROUTES[1].summaryPolyline } : {}) },
    ] : [activity];
    const nextState = reduceCompete({ ...single.state, activities: [...kept, ...activities] }, { type: "set-primary", sport, accountId: accountKey, now: now.toISOString() });
    for (const track of gps ? ["open", "verified"] as const : ["open"] as const) {
      const after = buildArenaModel(nextState, now, track, sport);
      const you = after.lanes.find(l => l.you && !l.ghost)!;
      const crossed = after.lanes.filter(l => !l.you && !l.ghost && l.values[2] < you.values[2]).sort((a,b) => a.values[2] - b.values[2]);
      const before = Math.max(0, (crossed[0]?.values[2] ?? stepUnit) - stepUnit);
      baselines[arenaBaselineStorageKey(accountKey, sport, track)] = serializeArenaBaseline(periodStartIso, after.lanes.filter(l => !l.ghost).map(l => ({ id: l.id, value: l.you ? before : l.values[2] })), after.unit);
    }
    return { event, state: nextState, baselines, targetRoute: event === "sync-combo" ? "/today" : "/arena" };
  }

  if (event === "sync-activity") {
    const syncDisplay = (sport === "cycling" ? 11.2 : sport === "walking" ? 2.1 : gps ? 3.2 : 6) + jitter;
    const activity = makeDebugActivity(sport, syncDisplay, base.units, new Date(now.getTime() - 1000), `debug-sync-${stepIndex}-${now.getTime()}`);
    const nextState = reduceCompete(
      { ...base, activities: [...base.activities, activity] },
      { type: "set-primary", sport, accountId: accountKey, now: now.toISOString() },
    );
    for (const track of ["open", "verified"] as const) {
      const beforeYou = buildArenaModel(base, now, track, sport).lanes.find((l) => l.you && !l.ghost)?.values[2] ?? 0;
      const afterArena = buildArenaModel(nextState, now, track, sport);
      const youAfter = afterArena.lanes.find((l) => l.you && !l.ghost)?.values[2] ?? beforeYou;
      const lanes = afterArena.lanes.filter((l) => !l.ghost).map((l) => ({
        id: l.id,
        value: l.you ? beforeYou : l.values[2] >= beforeYou - 0.01 && l.values[2] <= youAfter + 0.01 ? Math.max(0, beforeYou - 0.2) : l.values[2],
      }));
      baselines[arenaBaselineStorageKey(accountKey, sport, track)] = serializeArenaBaseline(periodStartIso, lanes, afterArena.unit);
    }
    return { event, state: nextState, baselines, targetRoute: "/today", revealStopKey: `today:${dayKey(now, APP_TIMEZONE)}` };
  }

  if (event === "overtake" || event === "overtaken") {
    const tracks: readonly ScoreTrack[] = gps ? ["open", "verified"] : ["open"];
    const displayed = buildArenaModel(base, now, competitionTrack(sport), sport);
    const youCurrent = displayed.lanes.find((l) => l.you && !l.ghost)?.values[2] ?? 0;
    const rivalsAsc = displayed.lanes.filter((l) => !l.you && !l.ghost).slice().sort((a, b) => a.values[2] - b.values[2]);

    let youAfterTarget: number;
    if (event === "overtake") {
      const ahead = rivalsAsc.find((r) => r.values[2] > youCurrent + 0.15 * stepUnit) ?? rivalsAsc[0];
      const rVal = ahead?.values[2] ?? 5 * stepUnit;
      const nextUp = rivalsAsc.find((r) => r.values[2] > rVal + 0.35 * stepUnit);
      const margin = nextUp ? Math.min(0.9 * stepUnit, Math.max(0.18 * stepUnit, (nextUp.values[2] - rVal) * 0.52)) : 1.1 * stepUnit;
      youAfterTarget = rVal + margin + jitter;
    } else {
      const rivalsDesc = rivalsAsc.slice().reverse();
      const behind =
        rivalsDesc.find((r) => r.values[2] < youCurrent - 0.1 * stepUnit && r.values[2] > 0.8 * stepUnit) ??
        rivalsDesc.find((r) => r.values[2] > 0.8 * stepUnit) ??
        rivalsDesc[0];
      const rVal = behind?.values[2] ?? 6 * stepUnit;
      const lower = rivalsDesc.find((r) => r.values[2] < rVal - 0.35 * stepUnit);
      const margin = lower ? Math.min(0.75 * stepUnit, Math.max(0.18 * stepUnit, (rVal - lower.values[2]) * 0.45)) : 0.75 * stepUnit;
      youAfterTarget = Math.max(0.3 * stepUnit, rVal - margin - jitter);
    }

    const activity = makeDebugActivity(sport, youAfterTarget, base.units, new Date(now.getTime() - 1000), `debug-${event}-${stepIndex}-${now.getTime()}`);
    const kept = base.activities.filter((a) => a.sport !== sport || Date.parse(a.startedAt) < period.startsAt.getTime() || Date.parse(a.startedAt) >= period.endsAt.getTime());
    const nextState = reduceCompete(
      { ...base, activities: [...kept, activity] },
      { type: "set-primary", sport, accountId: accountKey, now: now.toISOString() },
    );

    for (const track of tracks) {
      const afterArena = buildArenaModel(nextState, now, track, sport);
      const youAfter = afterArena.lanes.find((l) => l.you && !l.ghost)?.values[2] ?? youAfterTarget;
      const trackRivals = afterArena.lanes.filter((l) => !l.you && !l.ghost).slice().sort((a, b) => a.values[2] - b.values[2]);
      const rival =
        event === "overtake"
          ? trackRivals.filter((r) => r.values[2] < youAfter - 0.02).slice(-1)[0] ?? trackRivals[0]
          : trackRivals.find((r) => r.values[2] > youAfter + 0.05) ?? trackRivals[trackRivals.length - 1];
      const youBefore = event === "overtake" ? Math.max(0, (rival?.values[2] ?? youAfter) - 0.95 * stepUnit) : youAfter;
      const rivalStart =
        event === "overtake"
          ? Math.max(youBefore + 0.25 * stepUnit, (rival?.values[2] ?? 0) - 0.35 * stepUnit)
          : Math.max(0, youAfter - 0.95 * stepUnit);

      const lanes = afterArena.lanes.filter((l) => !l.ghost).map((l) => {
        if (l.you) return { id: l.id, value: youBefore };
        if (rival && l.id === rival.id) return { id: l.id, value: rivalStart };
        if (event === "overtake" && l.values[2] > youBefore && l.values[2] < youAfter) return { id: l.id, value: Math.max(0, youBefore - 0.2) };
        return { id: l.id, value: l.values[2] };
      });
      baselines[arenaBaselineStorageKey(accountKey, sport, track)] = serializeArenaBaseline(periodStartIso, lanes, afterArena.unit);
    }

    return { event, state: nextState, baselines, targetRoute: "/arena" };
  }

  // week-closing
  const hasWeekActivity = base.activities.some((a) => {
    const t = Date.parse(a.startedAt);
    return a.sport === sport && countsOnTrack(a, competitionTrack(sport)) && t >= period.startsAt.getTime() && t < period.endsAt.getTime() && t <= now.getTime();
  });
  const seeded = hasWeekActivity
    ? base
    : { ...base, activities: [...base.activities, makeDebugActivity(sport, 6 * stepUnit, base.units, new Date(now.getTime() - 3600_000), `debug-week-${stepIndex}-${now.getTime()}`)] };
  const settled = reduceCompete(seeded, { type: "debug-close-week", accountId: accountKey, now: now.toISOString() });
  return { event, state: settled, baselines, targetRoute: "/arena?results=latest" };
}
