import { fieldDefaultSpan } from "./field-course";
import { arenaBaselineStorageKey, readArenaBaseline, reconcileArenaOvertake, serializeArenaBaseline, type ArenaOvertakePlan, type ArenaSceneLane } from "./arena-view";
import { buildArenaModel, competePeriodWindow } from "./phone-views";
import { competeNow, type Action } from "./compete/engine";
import { initialsFromName } from "./compete/track";
import { competitionTrack, type CompeteState, type SportId } from "./compete/sports";

export interface CompetitionMoment {
  id: string;
  sport: SportId;
  unit: "km" | "mi" | "pts";
  lanes: ArenaSceneLane[];
  plan: ArenaOvertakePlan;
}

/** Separate from the browsable field: visiting a tab must never consume an event. */
export const momentStorageKey = (arenaKey: string) => `moment:v1:${arenaKey}`;

export function competitionMomentSnapshots(state: CompeteState, account: string) {
  const now = competeNow(state);
  return state.ratings.filter(r => r.optedIn && state.enrollments.some(e => e.sport === r.sport)).map(r => {
    const track = competitionTrack(r.sport);
    const arena = buildArenaModel(state, now, track, r.sport);
    const period = competePeriodWindow(state, now, r.sport).startsAt.toISOString();
    const lanes: ArenaSceneLane[] = arena.lanes.filter(l => !l.ghost).map(l => ({ id: l.id, name: l.name, initials: initialsFromName(l.name), you: l.you, avatarUrl: l.avatarUrl, lastUpdated: l.lastUpdated, value: l.values[2] }));
    const arenaKey = arenaBaselineStorageKey(account, r.sport, track);
    return { sport: r.sport, unit: arena.unit, period, lanes, arenaKey, key: momentStorageKey(arenaKey), value: serializeArenaBaseline(period, lanes, arena.unit) };
  });
}

export function competitionMoments(state: CompeteState, account: string, read: (key: string) => string | null) {
  return competitionMomentSnapshots(state, account).flatMap(s => {
    const previous = readArenaBaseline(read(s.key), s.period, s.unit);
    const plan = reconcileArenaOvertake(s.lanes, previous);
    if (!plan || (!plan.hasOvertake && !plan.passedByIds?.length)) return [];
    const common = { sport: s.sport, unit: s.unit, lanes: s.lanes };
    if (plan.hasOvertake && plan.passedByIds?.length) {
      const middleRank = 1 + Object.values(plan.rivals).filter(r => r.endValue > plan.youBefore + .00001).length;
      const rivalPlan: ArenaOvertakePlan = { ...plan, hasOvertake: false, overtakenIds: [], youAfter: plan.youBefore, rankAfter: middleRank,
        rivals: Object.fromEntries(Object.entries(plan.rivals).map(([id, r]) => [id, { ...r, overtaken: false }])) };
      const ownPlan: ArenaOvertakePlan = { ...plan, passedByIds: [], passedByNames: [], rankBefore: middleRank, anyRivalMoved: false, rivalSlideEnd: 0,
        rivals: Object.fromEntries(Object.entries(plan.rivals).map(([id, r]) => [id, { ...r, startValue: r.endValue, moved: false, passedYou: false }])) };
      return [
        { ...common, id: `${s.key}:${s.value}:rivals`, plan: rivalPlan },
        { ...common, id: `${s.key}:${s.value}:you`, plan: ownPlan },
      ];
    }
    return [{ ...common, id: `${s.key}:${s.value}`, plan } satisfies CompetitionMoment];
  });
}

/** Exclude before reducing, so deselected volume never awards a milestone first. */
export function selectedSyncActions(actions: Action[], selected: readonly string[]): Action[] {
  const ids = new Set(selected);
  return actions.flatMap(a => [
    ...(a.activities ?? []).filter(activity => !ids.has(activity.id)).map(activity => ({
      type: "set-disposition", activityId: activity.id, disposition: "excluded", accountId: a.accountId, now: a.now,
    } satisfies Action)),
    { ...a, activities: a.activities?.map(activity => ids.has(activity.id) ? activity : {
      ...activity, disposition: "excluded" as const, dispositionReason: "Deselected during sync review.",
    }) },
  ]);

}

/** Slow down around every crossing, independent of how many peers were passed. */
export function photoFinishFrame(moment: CompetitionMoment, progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const { plan } = moment;
  const peers = Object.values(plan.rivals).filter(r => r.overtaken || r.passedYou);
  const passedBy = !plan.hasOvertake;
  const crossing = (r: typeof peers[number]) => passedBy
    ? (plan.youBefore - r.startValue) / Math.max(.00001, r.endValue - r.startValue - (plan.youAfter - plan.youBefore))
    : (r.endValue - plan.youBefore) / Math.max(.00001, plan.youAfter - plan.youBefore);
  const crossings = peers.map(crossing).map(v => Math.max(.04, Math.min(.96, v))).sort((a, b) => a - b);
  // Integrate a low speed near each pass and invert its cumulative timeline.
  const weights = Array.from({ length: 240 }, (_, i) => {
    const t = (i + .5) / 240;
    return 1 + crossings.reduce((n, c) => n + 5 * Math.exp(-Math.pow((t - c) / .045, 2)), 0);
  });
  const total = weights.reduce((n, w) => n + w, 0);
  const target = Math.max(0, Math.min(1, (p - .1) / .8)) * total;
  let sum = 0, travel = 1;
  for (let i = 0; i < weights.length; i++) {
    if (sum + weights[i] >= target) { travel = (i + (target - sum) / weights[i]) / weights.length; break; }
    sum += weights[i];
  }
  if (p >= .9) travel = 1;
  if (p <= .1) travel = 0;
  const youValue = travel === 1 ? plan.youAfter : travel === 0 ? plan.youBefore : plan.youBefore + (plan.youAfter - plan.youBefore) * travel;
  const values: Record<string, number> = { [plan.youId]: youValue };
  for (const r of Object.values(plan.rivals)) values[r.id] = passedBy && travel < 1 ? r.startValue + (r.endValue - r.startValue) * travel : r.endValue;
  const passed = peers.filter(r => passedBy ? values[r.id] > youValue : youValue > r.endValue);
  const nearest = peers.slice().sort((a, b) => Math.abs(values[a.id] - youValue) - Math.abs(values[b.id] - youValue))[0];
  const nearestCrossing = nearest ? crossing(nearest) : 0;
  const focus = nearest ? Math.exp(-Math.pow((travel - nearestCrossing) / .075, 2)) * (p < .95 ? 1 : 0) : 0;
  const rank = 1 + Object.values(plan.rivals).filter(r => values[r.id] > youValue).length;
  return { progress: p, travel, youValue, values, count: p >= 1 ? peers.length : passed.length, rank: p >= 1 ? plan.rankAfter : rank, focus, nearestId: nearest?.id, done: p >= 1 };
}

/** Replay the complete captured field using the production lane geometry. */
export function competitionMomentScene(moment: CompetitionMoment, progress: number) {
  const frame = photoFinishFrame(moment, progress);
  const lanes = moment.lanes.map(lane => ({ ...lane, value: frame.values[lane.id] ?? lane.value }));
  const standings = [...lanes].sort((a, b) => b.value - a.value).map(lane => ({
    ...lane, place: 1 + lanes.filter(peer => peer.value > lane.value).length,
  }));
  const ownIndex = standings.findIndex(lane => lane.you);
  const start = Math.max(0, Math.min(ownIndex - 1, standings.length - 3));
  const rival = frame.nearestId ? frame.values[frame.nearestId] : frame.youValue;
  const replayFocusIds = [moment.plan.youId, ...(frame.nearestId ? [frame.nearestId] : [])];
  return { ...frame, lanes, replayFocusIds, standings: standings.slice(start, start + 3), view: {
    center: (frame.youValue+rival)/2,
    span: Math.max(fieldDefaultSpan(moment.unit) * (1 - frame.focus * .18),Math.abs(frame.youValue-rival)*3),
  } };
}
