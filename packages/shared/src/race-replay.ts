import {analyzeRaceSplits,RACE_METERS,type RaceTimingSplits} from "./race-splits";
export type ReplayCourse={points:[number,number,number][];sourceUrl:string;attribution:string};
export type ReplayRunner={id:number;name:string;startAt:string|null;splits:RaceTimingSplits};
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
export function compileReplayRunner(runner:ReplayRunner,distance:string) {
  const analysis=analyzeRaceSplits(runner.splits,distance);
  if(analysis.status!=="ready") return null;
  return {...runner,startMs:runner.startAt ? Date.parse(runner.startAt) : NaN,points:[{distanceM:0,elapsedMs:0,ordinal:-1},...analysis.rows.flatMap((row,ordinal)=>row.elapsedMs===null ? [] : [{distanceM:row.distanceM,elapsedMs:row.elapsedMs,ordinal}])]};
}
export type CompiledReplayRunner=NonNullable<ReturnType<typeof compileReplayRunner>>;
export function replayDistance(runner:CompiledReplayRunner,time:number) {
  const points=runner.points;if(time<0 || !Number.isFinite(time)) return null;
  if(time>=runner.splits.finishMs) return points[points.length-1].distanceM;
  let low=0,high=points.length-1;
  while(low+1<high){const middle=(low+high)>>>1;if(points[middle].elapsedMs<=time) low=middle;else high=middle;}
  const a=points[low],b=points[high];
  if(time===a.elapsedMs) return a.distanceM;
  if(time===b.elapsedMs) return b.distanceM;
  if(b.ordinal!==a.ordinal+1) return null;
  return a.distanceM+(b.distanceM-a.distanceM)*(time-a.elapsedMs)/(b.elapsedMs-a.elapsedMs);
}
export function replayTimeline(runners:CompiledReplayRunner[],wall:boolean) {
  const starts=runners.map(r=>r.startMs);
  const wallAvailable=starts.length>0 && starts.every(Number.isFinite);
  const origin=wall && wallAvailable ? starts.reduce((minimum,value)=>Math.min(minimum,value),Infinity) : null;
  return {wallAvailable,origin,duration:runners.reduce((maximum,r,i)=>Math.max(maximum,r.splits.finishMs+(origin!==null ? starts[i]-origin : 0)),0)};
}
export function replayFeatures(course:ReplayCourse,runners:CompiledReplayRunner[],time:number,origin:number|null=null) {
  const features:{type:"Feature";id:number;properties:{id:number};geometry:{type:"Point";coordinates:[number,number]}}[]=[];
  for(const runner of runners){const metres=replayDistance(runner,time-(origin!==null && Number.isFinite(runner.startMs) ? runner.startMs-origin : 0));
    if(metres!==null) features.push({type:"Feature",id:runner.id,properties:{id:runner.id},geometry:{type:"Point",coordinates:replayCoordinate(course,metres)}});
  }
  return {type:"FeatureCollection" as const,features};
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
