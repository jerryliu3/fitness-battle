import { bearing } from "@turf/turf";
import { analyzeRaceSplits, RACE_METERS, type RaceTimingSplits } from "./race-splits";
export type ReplayCourse={points:[number,number,number][];sourceUrl:string;attribution:string};
export type ReplayRunner={id:number;name:string;bib?:string|null;startAt:string|null;splits:RaceTimingSplits};
export type ReplayPage={version:string;course:ReplayCourse|null;totalAvailable:number;runners:ReplayRunner[];next:number|null};
export type ReplayData={version:string;course:ReplayCourse;totalAvailable:number;runners:ReplayRunner[]};
export function validateReplayCourse(course:ReplayCourse,distance:string) {
  let previous=-1;
  return course.points.length>=2 && course.points.length<=20000 && course.points.every((point,index)=>{
    const valid=point.length===3 && point.every(Number.isFinite) && Math.abs(point[0])<=180 && Math.abs(point[1])<=85 && point[2]>previous && (index!==0 || point[2]===0);
    previous=point[2];return valid;
  }) && previous===RACE_METERS[distance];
}
export function replayCoordinate(course:ReplayCourse,metres:number):[number,number] {
  const points=course.points;
  let low=0,high=points.length-1;
  const target=Math.max(0,Math.min(metres,points[high][2]));
  while(low+1<high){const middle=(low+high)>>>1;if(points[middle][2]<=target) low=middle;else high=middle;}
  const a=points[low],b=points[high],fraction=(target-a[2])/(b[2]-a[2]);
  // Longitude unwrap preserves routes crossing the antimeridian.
  let delta=b[0]-a[0];if(delta>180) delta-=360;if(delta< -180) delta+=360;
  return [((a[0]+fraction*delta+540)%360)-180,a[1]+fraction*(b[1]-a[1])];
}
/** Course tangent, averaged over a short window so every small vertex doesn't turn the camera. */
export function replayCourseBearing(course: ReplayCourse, metres: number) {
  const before = replayCoordinate(course, metres - 15);
  const after = replayCoordinate(course, metres + 15);
  return bearing(before, after);
}
function flatTimingSplits(splits: RaceTimingSplits, distance: string): RaceTimingSplits | null {
  const total = RACE_METERS[distance];
  if (!total || !Number.isFinite(splits.finishMs) || splits.finishMs <= 0) return null;
  if (splits.checkpoints.some((point) => point.elapsedMs != null && point.distanceM > 0 && point.distanceM < total)) {
    return null;
  }
  return {
    ...splits,
    checkpoints: [{ distanceM: total, elapsedMs: splits.finishMs }],
  };
}

/** Recorded mats when present; otherwise constant pace along the reviewed course polyline. */
export function compileReplayRunner(runner: ReplayRunner, distance: string) {
  let analysis = analyzeRaceSplits(runner.splits, distance);
  if (analysis.status !== "ready") {
    const flat = flatTimingSplits(runner.splits, distance);
    if (flat) analysis = analyzeRaceSplits(flat, distance);
  }
  if (analysis.status !== "ready") return null;
  return {...runner,startMs:runner.splits.clock==="chip" && runner.startAt ? Date.parse(runner.startAt) : NaN,points:[{distanceM:0,elapsedMs:0,ordinal:-1},...analysis.rows.flatMap((row,ordinal)=>row.elapsedMs===null ? [] : [{distanceM:row.distanceM,elapsedMs:row.elapsedMs,ordinal}])]};
}
export type CompiledReplayRunner=NonNullable<ReturnType<typeof compileReplayRunner>>;
function replaySegment(points: CompiledReplayRunner["points"], time: number) {
  let low = 0, high = points.length - 1;
  while (low + 1 < high) {
    const middle = (low + high) >>> 1;
    if (points[middle].elapsedMs <= time) low = middle;
    else high = middle;
  }
  return [points[low], points[high]] as const;
}

export function replayDistance(runner:CompiledReplayRunner,time:number) {
  const points=runner.points;if(time<0 || !Number.isFinite(time)) return null;
  if(time>=runner.splits.finishMs) return points[points.length-1].distanceM;
  const [a,b]=replaySegment(points,time);
  if(time===a.elapsedMs) return a.distanceM;
  if(time===b.elapsedMs) return b.distanceM;
  if(b.ordinal!==a.ordinal+1) return null;
  return a.distanceM+(b.distanceM-a.distanceM)*(time-a.elapsedMs)/(b.elapsedMs-a.elapsedMs);
}
export function replayTimeline(runners:CompiledReplayRunner[],wall:boolean) {
  const starts=runners.map(r=>r.startMs);
  const wallAvailable=starts.length>0 && runners.every(r=>r.splits.clock==="chip") && starts.every(Number.isFinite);
  const origin=wall && wallAvailable ? starts.reduce((minimum,value)=>Math.min(minimum,value),Infinity) : null;
  return {wallAvailable,origin,duration:runners.reduce((maximum,r,i)=>Math.max(maximum,r.splits.finishMs+(origin!==null ? starts[i]-origin : 0)),0)};
}
export function replayTelemetry(runner: CompiledReplayRunner, time: number, origin: number | null) {
  const elapsed = time - (origin === null ? 0 : runner.startMs - origin);
  const distanceM = replayDistance(runner, elapsed);
  if (distanceM === null) return null;
  const elapsedMs = Math.min(elapsed, runner.splits.finishMs);
  const [start, end] = replaySegment(runner.points, elapsedMs);
  const currentPaceMsPerKm = elapsed < runner.splits.finishMs && end.ordinal === start.ordinal + 1
    ? (end.elapsedMs - start.elapsedMs) * 1000 / (end.distanceM - start.distanceM)
    : null;
  return { distanceM, elapsedMs, currentPaceMsPerKm };
}

/** Cap map updates as the field grows, while the playhead follows real elapsed time. */
export function replayFrameInterval(fieldSize: number) {
  return fieldSize <= 32 ? 1000 / 30 : fieldSize <= 250 ? 50 : fieldSize <= 1000 ? 100 : 200;
}

const REPLAY_ROAD_HALF_WIDTH_M = 5.5;
const REPLAY_LANE_SPREAD_M = 4.5;
const REPLAY_WEAVE_AMP_M = 1.4;
const EARTH_CIRCUMFERENCE_M = 40_075_016.686;

function hash32(seed: number): number {
  let x = seed | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

function runnerLateralParams(runnerId: number): [number, number, number] {
  const u1 = hash32(runnerId ^ 0x9e3779b9) / 4294967296;
  const u2 = hash32(runnerId ^ 0x7f4a7c15) / 4294967296;
  const u3 = hash32(runnerId ^ 0x517cc1b7) / 4294967296;
  const u4 = hash32(runnerId ^ 0x2c1b3c6d) / 4294967296;
  const baseM = (u1 + u2 - 1) * REPLAY_LANE_SPREAD_M;
  const freq = (2 * Math.PI) / (180 + u3 * 160);
  const phase = u4 * 2 * Math.PI;
  return [baseM, freq, phase];
}

/** Deterministic lateral road offset (metres) with gentle slow weaving across the road width. */
export function replayLateralOffsetM(runnerId: number, distanceM: number): number {
  const [baseM, freq, phase] = runnerLateralParams(runnerId);
  const raw = baseM + REPLAY_WEAVE_AMP_M * Math.sin(distanceM * freq + phase);
  return Math.max(-REPLAY_ROAD_HALF_WIDTH_M, Math.min(REPLAY_ROAD_HALF_WIDTH_M, raw));
}

export function replayFeatures(
  course: ReplayCourse,
  runners: CompiledReplayRunner[],
  time: number,
  origin: number | null = null,
  courseIndex?: ReplayCourseIndex,
) {
  const features: { type: "Feature"; id: number; properties: { id: number; distanceM: number }; geometry: { type: "Point"; coordinates: [number, number] } }[] = [];
  for (const runner of runners) {
    const metres = replayDistance(runner, time - (origin !== null && Number.isFinite(runner.startMs) ? runner.startMs - origin : 0));
    if (metres !== null) {
      const lateralM = replayLateralOffsetM(runner.id, metres);
      features.push({
        type: "Feature",
        id: runner.id,
        properties: { id: runner.id, distanceM: metres },
        geometry: {
          type: "Point",
          coordinates: courseIndex
            ? replayCoordinateAt(courseIndex, metres, lateralM)
            : replayCoordinate(course, metres),
        },
      });
    }
  }
  return { type: "FeatureCollection" as const, features };
}
/** Page until exhaustion; no fastest-200 ceiling. Caller owns cancellation and progress UI. */
export async function loadReplayField(fetchPage:(after:number)=>Promise<ReplayPage>,cancelled:()=>boolean,onProgress:(count:number)=>void):Promise<ReplayData> {
  let after=0,course:ReplayCourse|null=null,version="",totalAvailable=0;
  const runners:ReplayRunner[]=[];
  while(true){if(cancelled()) throw new Error("Cancelled");const page=await fetchPage(after);
    if(cancelled()) throw new Error("Cancelled");
    if(!course){if(!page.course) throw new Error("Course unavailable");course=page.course;version=page.version;totalAvailable=page.totalAvailable;}
    else if(page.version!==version) throw new Error("Course changed; reload replay");
    if(page.runners.some((r,i)=>r.id<=(i ? page.runners[i-1].id : after))) throw new Error("Invalid replay page");
    runners.push(...page.runners);onProgress(runners.length);
    if(page.next===null) return {course,version,totalAvailable,runners};
    if(page.next<=after || page.next!==page.runners.at(-1)?.id) throw new Error("Invalid replay cursor");after=page.next;
  }
}

const MAX_MERCATOR_LAT = 85.0511287798066;

export function lngLatToMercator(lon: number, lat: number): [number, number] {
  const clampedLat = Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat));
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);
  const mx = (lon + 180) / 360;
  const my = 0.5 - (0.25 * Math.log((1 + sinLat) / (1 - sinLat))) / Math.PI;
  return [mx, my];
}

export type ReplayCourseIndex = {
  totalMeters: number;
  buckets: number;
  stepMeters: number;
  invStep: number;
  originMx: number;
  originMy: number;
  lng: Float64Array;
  lat: Float64Array;
  dx: Float32Array;
  dy: Float32Array;
  nx: Float32Array;
  ny: Float32Array;
  nLng: Float64Array;
  nLat: Float64Array;
};

/** Pre-bake course polyline into a uniform-distance LUT for O(1) coordinate, road-normal & relative-Mercator lookup. */
export function buildReplayCourseIndex(course: ReplayCourse, buckets = 4096): ReplayCourseIndex {
  const pts = course.points;
  const totalMeters = pts[pts.length - 1][2];
  const count = Math.max(2, buckets);
  const stepMeters = totalMeters > 0 ? totalMeters / count : 1;
  const invStep = totalMeters > 0 ? count / totalMeters : 0;

  // Unwrap longitudes once so antimeridian crossings interpolate cleanly.
  const unwrappedLon = new Float64Array(pts.length);
  unwrappedLon[0] = pts[0][0];
  for (let i = 1; i < pts.length; i++) {
    let delta = pts[i][0] - pts[i - 1][0];
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;
    unwrappedLon[i] = unwrappedLon[i - 1] + delta;
  }

  const [originMx, originMy] = lngLatToMercator(pts[0][0], pts[0][1]);
  const lng = new Float64Array(count + 1);
  const lat = new Float64Array(count + 1);
  const dx = new Float32Array(count + 1);
  const dy = new Float32Array(count + 1);

  let seg = 0;
  const lastPt = pts.length - 1;
  for (let i = 0; i <= count; i++) {
    const target = i === count ? totalMeters : i * stepMeters;
    while (seg + 1 < lastPt && pts[seg + 1][2] <= target) seg++;
    const a = pts[seg];
    const b = pts[Math.min(lastPt, seg + 1)];
    const span = b[2] - a[2];
    const frac = span > 0 ? Math.max(0, Math.min(1, (target - a[2]) / span)) : 0;
    const rawLon = unwrappedLon[seg] + frac * (unwrappedLon[Math.min(lastPt, seg + 1)] - unwrappedLon[seg]);
    const wrappedLon = ((rawLon + 540) % 360) - 180;
    const interpLat = a[1] + frac * (b[1] - a[1]);
    lng[i] = wrappedLon;
    lat[i] = interpLat;
    const [mx, my] = lngLatToMercator(rawLon, interpLat);
    dx[i] = mx - originMx;
    dy[i] = my - originMy;
  }

  // Pre-bake smoothed perpendicular road normals scaled to units-per-meter.
  const nx = new Float32Array(count + 1);
  const ny = new Float32Array(count + 1);
  const nLng = new Float64Array(count + 1);
  const nLat = new Float64Array(count + 1);
  const halfWin = Math.max(1, Math.round(15 / Math.max(1, stepMeters)));
  let prevUx = 0;
  let prevUy = 1;
  for (let i = 0; i <= count; i++) {
    const i0 = Math.max(0, i - halfWin);
    const i1 = Math.min(count, i + halfWin);
    const tx = dx[i1] - dx[i0];
    const ty = dy[i1] - dy[i0];
    const len = Math.hypot(tx, ty);
    let ux = prevUx;
    let uy = prevUy;
    if (len > 1e-12) {
      ux = -ty / len;
      uy = tx / len;
      prevUx = ux;
      prevUy = uy;
    }
    const cosLat = Math.max(0.05, Math.cos((lat[i] * Math.PI) / 180));
    const mercPerM = 1 / (EARTH_CIRCUMFERENCE_M * cosLat);
    const mxPerM = ux * mercPerM;
    const myPerM = uy * mercPerM;
    nx[i] = mxPerM;
    ny[i] = myPerM;
    nLng[i] = 360 * mxPerM;
    nLat[i] = -360 * cosLat * myPerM;
  }

  return { totalMeters, buckets: count, stepMeters, invStep, originMx, originMy, lng, lat, dx, dy, nx, ny, nLng, nLat };
}

export function replayCoordinateAt(index: ReplayCourseIndex, metres: number, lateralM = 0): [number, number] {
  const clamped = Math.max(0, Math.min(metres, index.totalMeters));
  const f = clamped * index.invStep;
  const i = Math.min(index.buckets - 1, f | 0);
  const frac = f - i;
  let delta = index.lng[i + 1] - index.lng[i];
  if (delta > 180) delta -= 360;
  else if (delta < -180) delta += 360;
  let lon = index.lng[i] + frac * delta;
  let latitude = index.lat[i] + frac * (index.lat[i + 1] - index.lat[i]);
  if (lateralM !== 0) {
    lon += lateralM * (index.nLng[i] + frac * (index.nLng[i + 1] - index.nLng[i]));
    latitude += lateralM * (index.nLat[i] + frac * (index.nLat[i + 1] - index.nLat[i]));
  }
  return [((lon + 540) % 360) - 180, Math.max(-85, Math.min(85, latitude))];
}

export function replayMercatorOffsetAt(index: ReplayCourseIndex, metres: number, lateralM = 0): [number, number] {
  const clamped = Math.max(0, Math.min(metres, index.totalMeters));
  const f = clamped * index.invStep;
  const i = Math.min(index.buckets - 1, f | 0);
  const frac = f - i;
  let x = index.dx[i] + frac * (index.dx[i + 1] - index.dx[i]);
  let y = index.dy[i] + frac * (index.dy[i + 1] - index.dy[i]);
  if (lateralM !== 0) {
    x += lateralM * (index.nx[i] + frac * (index.nx[i + 1] - index.nx[i]));
    y += lateralM * (index.ny[i] + frac * (index.ny[i + 1] - index.ny[i]));
  }
  return [x, y];
}

export type CompiledReplayField = {
  count: number;
  ids: Int32Array;
  finishMs: Uint32Array;
  startOffsetMs: Float32Array;
  laneBaseM: Float32Array;
  weaveFreq: Float32Array;
  weavePhase: Float32Array;
  cpOffsets: Uint32Array;
  cpDistM: Float32Array;
  cpElapsedMs: Uint32Array;
  cpOrdinal: Int16Array;
  cursors: Uint32Array;
  finishOrder: Int32Array;
  names: string[];
  namesLower: string[];
  bibs: (string | null)[];
  bibsLower: string[];
  idToIndex: Map<number, number>;
  wallAvailable: boolean;
  wallOrigin: number | null;
  duration: number;
  fastestFinishMs: number;
};

/** Structure-of-Arrays TypedArray representation of compiled runners for zero-alloc per-frame evaluation. */
export function buildCompiledReplayField(runners: CompiledReplayRunner[], wall: boolean): CompiledReplayField {
  const count = runners.length;
  const timeline = replayTimeline(runners, wall);
  const ids = new Int32Array(count);
  const finishMs = new Uint32Array(count);
  const startOffsetMs = new Float32Array(count);
  const laneBaseM = new Float32Array(count);
  const weaveFreq = new Float32Array(count);
  const weavePhase = new Float32Array(count);
  const cpOffsets = new Uint32Array(count + 1);
  const cursors = new Uint32Array(count);
  const names: string[] = new Array(count);
  const namesLower: string[] = new Array(count);
  const bibs: (string | null)[] = new Array(count);
  const bibsLower: string[] = new Array(count);
  const idToIndex = new Map<number, number>();

  let totalPts = 0;
  let fastestFinishMs = count > 0 ? Infinity : 0;
  for (let i = 0; i < count; i++) {
    totalPts += runners[i].points.length;
    if (runners[i].splits.finishMs < fastestFinishMs) {
      fastestFinishMs = runners[i].splits.finishMs;
    }
  }

  const cpDistM = new Float32Array(totalPts);
  const cpElapsedMs = new Uint32Array(totalPts);
  const cpOrdinal = new Int16Array(totalPts);

  let ptr = 0;
  for (let i = 0; i < count; i++) {
    const r = runners[i];
    ids[i] = r.id;
    finishMs[i] = r.splits.finishMs;
    startOffsetMs[i] = timeline.origin !== null && Number.isFinite(r.startMs) ? r.startMs - timeline.origin : 0;
    const [baseM, freq, phase] = runnerLateralParams(r.id);
    laneBaseM[i] = baseM;
    weaveFreq[i] = freq;
    weavePhase[i] = phase;
    names[i] = r.name;
    namesLower[i] = r.name.toLowerCase();
    bibs[i] = r.bib ?? null;
    bibsLower[i] = r.bib ? r.bib.toLowerCase() : "";
    idToIndex.set(r.id, i);

    cpOffsets[i] = ptr;
    const pts = r.points;
    for (let j = 0; j < pts.length; j++) {
      cpDistM[ptr] = pts[j].distanceM;
      cpElapsedMs[ptr] = pts[j].elapsedMs;
      cpOrdinal[ptr] = pts[j].ordinal;
      ptr++;
    }
  }
  cpOffsets[count] = ptr;

  const finishOrder = new Int32Array(count);
  for (let i = 0; i < count; i++) finishOrder[i] = i;
  finishOrder.sort((a, b) => finishMs[a] - finishMs[b] || ids[a] - ids[b]);

  return {
    count,
    ids,
    finishMs,
    startOffsetMs,
    laneBaseM,
    weaveFreq,
    weavePhase,
    cpOffsets,
    cpDistM,
    cpElapsedMs,
    cpOrdinal,
    cursors,
    finishOrder,
    names,
    namesLower,
    bibs,
    bibsLower,
    idToIndex,
    wallAvailable: timeline.wallAvailable,
    wallOrigin: timeline.origin,
    duration: timeline.duration,
    fastestFinishMs: Number.isFinite(fastestFinishMs) ? fastestFinishMs : 0,
  };
}

/**
 * Evaluates every runner's distance at `time` into `outDistM` (-1 if not started or in a missing-split gap).
 * Uses monotonic segment cursors for O(1) forward/backward playback; returns max active distance.
 */
export function evaluateFieldDistances(field: CompiledReplayField, time: number, outDistM: Float32Array): number {
  const { count, finishMs, startOffsetMs, cpOffsets, cpDistM, cpElapsedMs, cpOrdinal, cursors } = field;
  let maxDist = 0;
  if (!Number.isFinite(time)) {
    outDistM.fill(-1);
    return 0;
  }

  for (let i = 0; i < count; i++) {
    const effective = time - startOffsetMs[i];
    if (effective < 0) {
      outDistM[i] = -1;
      continue;
    }
    const start = cpOffsets[i];
    const end = cpOffsets[i + 1];
    const lastIdx = end - 1;
    if (lastIdx <= start) {
      outDistM[i] = -1;
      continue;
    }
    if (effective >= finishMs[i]) {
      const d = cpDistM[lastIdx];
      outDistM[i] = d;
      if (d > maxDist) maxDist = d;
      continue;
    }

    let seg = cursors[i];
    if (seg < start || seg >= lastIdx) seg = start;

    // Fast monotonic cursor walk (handles both forward playback and backward scrubbing)
    while (seg + 1 < lastIdx && cpElapsedMs[seg + 1] <= effective) seg++;
    while (seg > start && cpElapsedMs[seg] > effective) seg--;
    cursors[i] = seg;

    const tA = cpElapsedMs[seg];
    const tB = cpElapsedMs[seg + 1];
    if (effective === tA) {
      const d = cpDistM[seg];
      outDistM[i] = d;
      if (d > maxDist) maxDist = d;
      continue;
    }
    if (effective === tB) {
      const d = cpDistM[seg + 1];
      outDistM[i] = d;
      if (d > maxDist) maxDist = d;
      continue;
    }
    if (cpOrdinal[seg + 1] !== cpOrdinal[seg] + 1) {
      outDistM[i] = -1;
      continue;
    }
    const dA = cpDistM[seg];
    const d = dA + ((cpDistM[seg + 1] - dA) * (effective - tA)) / (tB - tA);
    outDistM[i] = d;
    if (d > maxDist) maxDist = d;
  }
  return maxDist;
}

/** Writes [dx0, dy0, dx1, dy1, ...] relative Mercator coordinates for active runners; returns vertex count written. */
export function fillMercatorPositions(
  courseIndex: ReplayCourseIndex,
  field: CompiledReplayField,
  distM: Float32Array,
  outXY: Float32Array,
  outIndices?: Int32Array,
): number {
  const { count, laneBaseM, weaveFreq, weavePhase } = field;
  const { totalMeters, buckets, invStep, dx, dy, nx, ny } = courseIndex;
  const maxBucket = buckets - 1;
  let written = 0;
  for (let i = 0; i < count; i++) {
    const m = distM[i];
    if (m < 0) continue;
    const clamped = m > totalMeters ? totalMeters : m;
    const f = clamped * invStep;
    const b = f >= maxBucket ? maxBucket : (f | 0);
    const frac = f - b;
    const rawLane = laneBaseM[i] + REPLAY_WEAVE_AMP_M * Math.sin(clamped * weaveFreq[i] + weavePhase[i]);
    const laneM =
      rawLane > REPLAY_ROAD_HALF_WIDTH_M
        ? REPLAY_ROAD_HALF_WIDTH_M
        : rawLane < -REPLAY_ROAD_HALF_WIDTH_M
          ? -REPLAY_ROAD_HALF_WIDTH_M
          : rawLane;
    const off = written << 1;
    outXY[off] = dx[b] + frac * (dx[b + 1] - dx[b]) + laneM * (nx[b] + frac * (nx[b + 1] - nx[b]));
    outXY[off + 1] = dy[b] + frac * (dy[b + 1] - dy[b]) + laneM * (ny[b] + frac * (ny[b + 1] - ny[b]));
    if (outIndices) outIndices[written] = i;
    written++;
  }
  return written;
}

function compareLiveRank(field: CompiledReplayField, distM: Float32Array, a: number, b: number): number {
  const da = distM[a] >= 0 ? distM[a] : 0;
  const db = distM[b] >= 0 ? distM[b] : 0;
  if (db !== da) return db - da;
  const fa = field.finishMs[a];
  const fb = field.finishMs[b];
  if (fa !== fb) return fa - fb;
  return field.ids[a] - field.ids[b];
}

/**
 * Selects a leaderboard slice without O(N log N) sorting of 50k+ runners for early pages or finish order.
 * Returns matching total count and the ordered runner indices for [offset, offset + limit).
 */
export function selectFieldRankSlice(
  field: CompiledReplayField,
  distM: Float32Array,
  mode: "field" | "finish",
  offset: number,
  limit: number,
  query = "",
): { total: number; indices: number[] } {
  const q = query.trim().toLowerCase().replace(/^#/, "");
  const count = field.count;
  if (count === 0) return { total: 0, indices: [] };

  if (mode === "finish") {
    const order = field.finishOrder;
    if (!q) {
      const safeOff = Math.max(0, Math.min(offset, count));
      const end = Math.min(count, safeOff + limit);
      const indices: number[] = [];
      for (let i = safeOff; i < end; i++) indices.push(order[i]);
      return { total: count, indices };
    }
    const matched: number[] = [];
    for (let i = 0; i < count; i++) {
      const idx = order[i];
      if (field.namesLower[idx].includes(q) || field.bibsLower[idx].includes(q)) {
        matched.push(idx);
      }
    }
    return { total: matched.length, indices: matched.slice(offset, offset + limit) };
  }

  // Live field mode with search query: filter first (usually tiny), then sort only matches.
  if (q) {
    const matched: number[] = [];
    for (let i = 0; i < count; i++) {
      if (field.namesLower[i].includes(q) || field.bibsLower[i].includes(q)) {
        matched.push(i);
      }
    }
    matched.sort((a, b) => compareLiveRank(field, distM, a, b));
    return { total: matched.length, indices: matched.slice(offset, offset + limit) };
  }

  const k = Math.min(count, offset + limit);
  // Use an O(N log K) bounded heap when fetching top pages (K <= 512) instead of full 50k sort.
  if (k > 0 && k <= 512 && k < count) {
    // Max-heap by rank (worst among current top-K at heap[0])
    const heap = new Int32Array(k);
    for (let i = 0; i < k; i++) heap[i] = i;
    const siftDown = (start: number, size: number) => {
      let idx = start;
      while (true) {
        const left = (idx << 1) + 1;
        if (left >= size) break;
        const right = left + 1;
        let worst = left;
        if (right < size && compareLiveRank(field, distM, heap[right], heap[left]) > 0) {
          worst = right;
        }
        if (compareLiveRank(field, distM, heap[worst], heap[idx]) > 0) {
          const tmp = heap[idx];
          heap[idx] = heap[worst];
          heap[worst] = tmp;
          idx = worst;
        } else {
          break;
        }
      }
    };
    for (let i = (k >>> 1) - 1; i >= 0; i--) siftDown(i, k);
    for (let i = k; i < count; i++) {
      if (compareLiveRank(field, distM, i, heap[0]) < 0) {
        heap[0] = i;
        siftDown(0, k);
      }
    }
    const top = Array.from(heap);
    top.sort((a, b) => compareLiveRank(field, distM, a, b));
    return { total: count, indices: top.slice(offset, offset + limit) };
  }

  const all = new Int32Array(count);
  for (let i = 0; i < count; i++) all[i] = i;
  all.sort((a, b) => compareLiveRank(field, distM, a, b));
  const indices: number[] = [];
  const end = Math.min(count, offset + limit);
  for (let i = offset; i < end; i++) indices.push(all[i]);
  return { total: count, indices };
}

/** Compact wire tuple: [id, name, bib, startEpochMs, finishMs, distancesM, elapsedMs] */
export type ReplayCompactTuple = [
  number,
  string,
  string | null,
  number | null,
  number,
  number[],
  (number | null)[],
];

export type ReplayCompactPage = {
  version: string;
  clock: "chip" | "gun";
  course: ReplayCourse | null;
  totalAvailable: number | null;
  runners: ReplayCompactTuple[];
  next: number | null;
};

export function compactReplayPage(page: ReplayPage, clock: "chip" | "gun" = "chip"): ReplayCompactPage {
  return {
    version: page.version,
    clock: page.runners[0]?.splits.clock ?? clock,
    course: page.course,
    totalAvailable: page.totalAvailable,
    runners: page.runners.map(r => {
      const startMs = r.startAt ? Date.parse(r.startAt) : NaN;
      return [
        r.id,
        r.name,
        r.bib ?? null,
        Number.isFinite(startMs) ? startMs : null,
        r.splits.finishMs,
        r.splits.checkpoints.map(c => c.distanceM),
        r.splits.checkpoints.map(c => c.elapsedMs),
      ];
    }),
    next: page.next,
  };
}

export function expandCompactRunner(tuple: ReplayCompactTuple, clock: "chip" | "gun", sourceUrl: string): ReplayRunner {
  const [id, name, bib, startMs, finishMs, dists, times] = tuple;
  const checkpoints: { distanceM: number; elapsedMs: number | null }[] = new Array(dists.length);
  for (let i = 0; i < dists.length; i++) {
    checkpoints[i] = { distanceM: dists[i], elapsedMs: times[i] ?? null };
  }
  return {
    id,
    name,
    bib,
    startAt: startMs !== null && Number.isFinite(startMs) ? new Date(startMs).toISOString() : null,
    splits: { clock, finishMs, sourceUrl, checkpoints },
  };
}

export async function loadReplayCompactField(
  fetchPage: (after: number) => Promise<ReplayCompactPage>,
  cancelled: () => boolean,
  onProgress: (count: number) => void,
): Promise<ReplayData> {
  let after = 0;
  let course: ReplayCourse | null = null;
  let version = "";
  let totalAvailable = 0;
  const runners: ReplayRunner[] = [];
  while (true) {
    if (cancelled()) throw new Error("Cancelled");
    const page = await fetchPage(after);
    if (cancelled()) throw new Error("Cancelled");
    if (!course) {
      if (!page.course) throw new Error("Course unavailable");
      course = page.course;
      version = page.version;
      totalAvailable = page.totalAvailable ?? page.runners.length;
    } else if (page.version !== version) {
      throw new Error("Course changed; reload replay");
    }
    const sourceUrl = course.sourceUrl;
    for (let i = 0; i < page.runners.length; i++) {
      const t = page.runners[i];
      const prevId = i > 0 ? page.runners[i - 1][0] : after;
      if (t[0] <= prevId) throw new Error("Invalid replay page");
      runners.push(expandCompactRunner(t, page.clock, sourceUrl));
    }
    onProgress(runners.length);
    if (page.next === null) return { course, version, totalAvailable, runners };
    const lastId = page.runners.at(-1)?.[0];
    if (page.next <= after || page.next !== lastId) throw new Error("Invalid replay cursor");
    after = page.next;
  }
}

/** Finds the closest active runner within `maxRadiusPx` screen pixels of a clicked [lng, lat]. */
export function pickNearestRunnerId(
  courseIndex: ReplayCourseIndex,
  field: CompiledReplayField,
  distM: Float32Array,
  clickLng: number,
  clickLat: number,
  zoom: number,
  maxRadiusPx = 14,
): number | null {
  const [clickMx, clickMy] = lngLatToMercator(clickLng, clickLat);
  const clickDx = clickMx - courseIndex.originMx;
  const clickDy = clickMy - courseIndex.originMy;
  const worldPx = 512 * Math.pow(2, zoom);
  const threshold = maxRadiusPx / Math.max(1, worldPx);
  let bestDistSq = threshold * threshold;
  let bestId: number | null = null;

  const { count, ids, laneBaseM, weaveFreq, weavePhase } = field;
  const { totalMeters, buckets, invStep, dx, dy, nx, ny } = courseIndex;
  const maxBucket = buckets - 1;

  for (let i = 0; i < count; i++) {
    const m = distM[i];
    if (m < 0) continue;
    const clamped = m > totalMeters ? totalMeters : m;
    const f = clamped * invStep;
    const b = f >= maxBucket ? maxBucket : (f | 0);
    const frac = f - b;
    const rawLane = laneBaseM[i] + REPLAY_WEAVE_AMP_M * Math.sin(clamped * weaveFreq[i] + weavePhase[i]);
    const laneM =
      rawLane > REPLAY_ROAD_HALF_WIDTH_M
        ? REPLAY_ROAD_HALF_WIDTH_M
        : rawLane < -REPLAY_ROAD_HALF_WIDTH_M
          ? -REPLAY_ROAD_HALF_WIDTH_M
          : rawLane;
    const px = dx[b] + frac * (dx[b + 1] - dx[b]) + laneM * (nx[b] + frac * (nx[b + 1] - nx[b])) - clickDx;
    const py = dy[b] + frac * (dy[b + 1] - dy[b]) + laneM * (ny[b] + frac * (ny[b + 1] - ny[b])) - clickDy;
    const dSq = px * px + py * py;
    if (dSq <= bestDistSq) {
      bestDistSq = dSq;
      bestId = ids[i];
    }
  }
  return bestId;
}
