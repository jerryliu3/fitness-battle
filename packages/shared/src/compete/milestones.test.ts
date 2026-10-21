import { describe, expect, it } from "vitest";
import { freshState, reduceCompete, rollClock } from "./engine";
import { milestoneStep } from "./milestones";
import { settleElo } from "./elo";
import { INACTIVITY_DECAY } from "./sports";
const now = new Date('2026-10-21T12:00:00Z');
const joined = () => reduceCompete(freshState(now), { type: 'opt-in', sport: 'running', now: now.toISOString() });
const log = (s: ReturnType<typeof joined>) => reduceCompete(s, { type: 'log-manual', sport: 'running', distanceM: 16093.44, movingSec: 3600, activityId: 'manual-test', now: now.toISOString() });
describe('activity score growth', () => {
  it('uses rank-specific fixed prices and sport units', () => {
    expect(milestoneStep('running',500)).toBe(1609.344);
    expect(milestoneStep('running',2000)).toBe(8046.72);
    expect(milestoneStep('cycling',500)).toBe(8046.72);
    expect(milestoneStep('strength',500)).toBe(1800);
  });
  it('awards immediately once, only on the eligible track', () => {
    const start=joined(), next=log(start);
    expect(next.ratings[0]!.openElo).toBeGreaterThan(start.ratings[0]!.openElo);
    expect(next.ratings[0]!.verifiedElo).toBe(start.ratings[0]!.verifiedElo);
    expect(rollClock(next,now)).toEqual(next);
    expect(log(next)).toEqual(next);
  });
  it('does not double award on exclusion/recount or reload', () => {
    const next=log(joined());
    const excluded=reduceCompete(next,{type:'set-disposition',activityId:'manual-test',disposition:'excluded',now:now.toISOString()});
    const counted=reduceCompete(JSON.parse(JSON.stringify(excluded)),{type:'set-disposition',activityId:'manual-test',disposition:'counted',now:now.toISOString()});
    expect(counted.ratings).toEqual(next.ratings);
  });
  it('never grows an inactive sport or scores future/sample activity', () => {
    const state=freshState(now), next=log(state);
    expect(next.ratings).toEqual(state.ratings);
    const start=joined();
    const future={...start, activities:[{ id:'future', sport:'running' as const, startedAt:'2026-10-22T12:00:00Z',distanceM:50000,movingSec:6000,avgHr:null,source:'strava' as const,verified:true }]};
    expect(rollClock(future,now).ratings).toEqual(start.ratings);
  });
  it('decays idle weeks without blocking milestone growth or winning placements', () => {
    expect(settleElo(1200, [1200], 1, 2, 0, false)).toBe(1200 - INACTIVITY_DECAY);
    expect(settleElo(1200, [1200], 0, 2, 10, false)).toBeGreaterThan(1200);
    expect(settleElo(1200, [1200], 1, 2, 10, false)).toBeLessThan(1200);
  });
});
