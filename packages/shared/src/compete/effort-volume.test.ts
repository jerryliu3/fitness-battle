import { eligibleTrainingXp } from './training-xp';
import { trainingXpForVolume } from './effort-score';
import { expect, it } from 'vitest';
import { liveEffortFromActivities } from './effort-volume';
import { createEmptyEffortState } from './effort-score';
import type { Activity } from './sports';
const run:Activity={id:'run',sport:'running',startedAt:'2026-11-16T13:00:00Z',distanceM:5000,movingSec:1800,avgHr:null,verified:true,source:'strava',provenance:'recorded',disposition:'counted'};
it('counts one canonical workout, excludes future and invalid records, and uses native units',()=>{
 const state={activities:[run,{...run},{...run,id:'future',startedAt:'2026-11-18T13:00:00Z'}, {...run,id:'excluded',startedAt:'2026-11-16T17:00:00Z',disposition:'excluded' as const}]};
 expect(eligibleTrainingXp(state,'running',new Date('2026-11-16T05:00:00Z'),new Date('2026-11-17T05:00:00Z'))).toBe(trainingXpForVolume('running',5000));
 const strength={activities:[{...run,id:'strength',sport:'strength' as const}]};
 expect(eligibleTrainingXp(strength,'strength',new Date('2026-11-16T05:00:00Z'),new Date('2026-11-17T05:00:00Z'))).toBe(trainingXpForVolume('strength',1800));
});
it('derives the same read-only preview on repeated reads and late imports',()=>{
 const state={activities:[run]},frozen=createEmptyEffortState(),now=new Date('2026-11-16T19:00:00Z');
 expect(liveEffortFromActivities(state,'running',frozen,now)).toEqual(liveEffortFromActivities({...state,activities:[run,run]},'running',frozen,now));
 expect(frozen.cumulativeNormalizedVolume).toBe(0);
});
