import { raceClock, raceTimeGap } from "./race-rankings";

export const RACE_METERS: Record<string, number> = {"5k":5000,"10k":10000,half_marathon:21097.5,marathon:42195};
export type RaceTimingSplits = {
  clock: "chip" | "gun";
  finishMs: number;
  sourceUrl: string;
  checkpoints: {distanceM: number; elapsedMs: number | null}[];
};
export type RaceSplitSegment = {
  distanceM: number; label: string; elapsedMs: number | null;
  segmentMs: number | null; paceMsPerKm: number | null;
};
export type RaceSplitAnalysis = {status:"unavailable" | "invalid"} | {
  status:"ready"; clock:"chip" | "gun"; rows:RaceSplitSegment[]; halfDeltaMs:number | null;
};

export function raceDistanceLabel(meters: number) { return `${meters/1000} km`; }
export function racePaceLabel(msPerKm: number) { return `${raceClock(Math.round(msPerKm/1000)*1000)}/km`; }

/** Observations only. Missing timing mats break adjacent-segment pace; no interpolation. */
export function analyzeRaceSplits(input: RaceTimingSplits | null | undefined, distance: string): RaceSplitAnalysis {
  if (!input) return {status:"unavailable"};
  const total = RACE_METERS[distance];
  const validTime = (value:number) => Number.isSafeInteger(value) && value>0;
  if (!total || !["chip","gun"].includes(input.clock) || !validTime(input.finishMs)
    || !input.checkpoints.length || input.checkpoints.length>100) return {status:"invalid"};
  let previousDistance=0, lastObserved=0;
  for (const point of input.checkpoints) {
    if (!Number.isFinite(point.distanceM) || point.distanceM<=previousDistance || point.distanceM>total
      || (point.elapsedMs!==null && (!validTime(point.elapsedMs) || point.elapsedMs<=lastObserved || point.elapsedMs>input.finishMs))
      || (point.distanceM<total && point.elapsedMs!==null && point.elapsedMs>=input.finishMs)
      || (point.distanceM===total && point.elapsedMs!==null && point.elapsedMs!==input.finishMs)) return {status:"invalid"};
    previousDistance=point.distanceM;
    if (point.elapsedMs!==null) lastObserved=point.elapsedMs;
  }
  const points = input.checkpoints.map(point => ({...point}));
  // The separately recorded finish is an observation, even when its timing-mat value is missing.
  if (previousDistance<total) points.push({distanceM:total,elapsedMs:input.finishMs});
  else points[points.length-1].elapsedMs=input.finishMs;
  const rows:RaceSplitSegment[]=[];
  let before={distanceM:0,elapsedMs:0 as number | null};
  for (const point of points) {
    const segmentMs=point.elapsedMs!==null && before.elapsedMs!==null ? point.elapsedMs-before.elapsedMs : null;
    rows.push({...point,label:point.distanceM===total ? "Finish" : raceDistanceLabel(point.distanceM),segmentMs,
      paceMsPerKm:segmentMs===null ? null : segmentMs/(point.distanceM-before.distanceM)*1000});
    before=point;
  }
  const halfway=points.find(point=>point.distanceM===total/2)?.elapsedMs;
  return {status:"ready",clock:input.clock,rows,halfDeltaMs:halfway ? input.finishMs-2*halfway : null};
}

export function raceHalfCaption(deltaMs: number) {
  return deltaMs===0 ? "Even halves" : `Second half ${raceTimeGap(deltaMs)} ${deltaMs<0 ? "faster" : "slower"}`;
}
