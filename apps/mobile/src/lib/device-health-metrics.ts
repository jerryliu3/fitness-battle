import { dayKey, startOfZonedDay, shiftAppDay, scoreSleepNight, type SleepNight, type SyncResult } from "@fitness-battle/shared";
type Sample={value?:number|string;startDate?:string;endDate?:string;sourceId?:string;time?:string;heartRateVariabilityMillis?:number};
type Native=Record<string,unknown>;
export type DeviceHealthExtra={dailyHealth:NonNullable<SyncResult["dailyHealth"]>;sleepNights:SleepNight[]};
const empty=():DeviceHealthExtra=>({dailyHealth:[],sleepNights:[]});
const union=(ranges:[number,number][])=>{let total=0,end=-Infinity;for(const [a,b] of ranges.sort((a,b)=>a[0]-b[0])){total+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}return total;};
/** Separate sources and union overlapping intervals so watch/phone copies cannot double sleep. */
export function appleSleepNights(samples:Sample[]):SleepNight[]{
 const sources=new Map<string,Sample[]>();for(const r of samples){if(!String(r.value).startsWith("ASLEEP"))continue;const key=r.sourceId??"unknown";sources.set(key,[...(sources.get(key)??[]),r]);}
 const nights:SleepNight[]=[];
 for(const [source,rows] of sources){const intervals=rows.map(r=>[Date.parse(r.startDate??""),Date.parse(r.endDate??"")] as [number,number]).filter(([a,b])=>Number.isFinite(a)&&b>a).sort((a,b)=>a[0]-b[0]);let groups:[number,number][][]=[];for(const range of intervals){const group=groups.at(-1);if(!group||range[0]>Math.max(...group.map(r=>r[1]))+90*60000)groups.push([range]);else group.push(range);}for(const group of groups){const end=Math.max(...group.map(r=>r[1])),durationMin=union(group)/60000;if(durationMin<180)continue;const day=dayKey(new Date(end));const stage=(name:string)=>{const parts=rows.filter(r=>String(r.value).includes(name)).map(r=>[Math.max(Date.parse(r.startDate??""),group[0][0]),Math.min(Date.parse(r.endDate??""),end)] as [number,number]).filter(([a,b])=>b>a);return parts.length?union(parts)/60000:null;};nights.push({id:`apple-health-${source}-${end}`,metric:"sleep",source:"apple_health",verified:true,day,durationMin,score:scoreSleepNight({durationMin}),efficiency:null,deepMin:stage("DEEP"),remMin:stage("REM"),lightMin:stage("CORE"),awakeMin:null});}}
 return [...new Map(nights.sort((a,b)=>b.durationMin-a.durationMin).map(n=>[n.day,n] as const).reverse()).values()];
}
export async function appleHealthExtra(native:Native,startDate:string,endDate:string):Promise<DeviceHealthExtra>{
 const result=empty();
 const read=async(name:string,options:Record<string,unknown>={}):Promise<Sample[]>=>{const fn=native[name];if(typeof fn!=="function")return [];return new Promise(resolve=>fn.call(native,{startDate,endDate,...options},(error:unknown,rows:Sample[])=>resolve(error||!Array.isArray(rows)?[]:rows)));};
 for(const [method,key,multiplier] of [["getDailyStepCountSamples","steps",1],["getRestingHeartRateSamples","restingHr",1],["getHeartRateVariabilitySamples","hrv",1000]] as const){const grouped=new Map<string,number[]>();for(const r of await read(method,{unit:key==="hrv"?"second":undefined,period:1440})){if(typeof r.value!=="number"||!Number.isFinite(r.value)||!r.startDate||!Number.isFinite(Date.parse(r.startDate)))continue;const day=dayKey(new Date(r.startDate));grouped.set(day,[...(grouped.get(day)??[]),r.value*multiplier]);}for(const [day,values] of grouped)result.dailyHealth.push({provider:"apple_health",day,[key]:key==="steps"?values.reduce((a,b)=>a+b,0):values.reduce((a,b)=>a+b,0)/values.length});}
 result.sleepNights=appleSleepNights(await read("getSleepSamples"));return result;
}
export async function androidHealthExtra(native:Native):Promise<DeviceHealthExtra>{
 const result=empty(),permission=native.requestPermission,aggregate=native.aggregateRecord,read=native.readRecords;
 if(typeof permission!=="function")return result;
 let grants:{recordType:string;accessType:string}[]=[];try{grants=await permission.call(native,["Steps","RestingHeartRate","HeartRateVariabilityRmssd","SleepSession"].map(recordType=>({recordType,accessType:"read"})));}catch{return result;}
 const allowed=(type:string)=>grants.some(p=>p.recordType===type&&p.accessType==="read");
 for(let i=6;i>=0;i--){const start=startOfZonedDay(shiftAppDay(new Date(),-i)),end=startOfZonedDay(shiftAppDay(start,1)),timeRangeFilter={operator:"between",startTime:start.toISOString(),endTime:end.toISOString()};const row:NonNullable<SyncResult["dailyHealth"]>[number]={provider:"google_health",day:dayKey(start)};
 if(typeof aggregate==="function")for(const [recordType,key,field] of [["Steps","steps","COUNT_TOTAL"],["RestingHeartRate","restingHr","BPM_AVG"]] as const){if(allowed(recordType))try{const value=await aggregate.call(native,{recordType,timeRangeFilter});if(typeof value[field]==="number")row[key]=value[field];}catch{/* Missing permission or unavailable source remains a gap. */}}
 if(typeof read==="function"&&allowed("HeartRateVariabilityRmssd"))try{const data=await read.call(native,"HeartRateVariabilityRmssd",{timeRangeFilter});const values=(data.records??[]).map((r:Sample)=>r.heartRateVariabilityMillis).filter((v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v));if(values.length)row.hrv=values.reduce((a:number,b:number)=>a+b,0)/values.length;}catch{/* Optional sensor. */}
 if(typeof read==="function"&&allowed("SleepSession"))try{const data=await read.call(native,"SleepSession",{timeRangeFilter});const intervals:Sample[]=[];for(const session of data.records??[]){for(const stage of session.stages??[]){const value=({2:"ASLEEP",4:"ASLEEP_CORE",5:"ASLEEP_DEEP",6:"ASLEEP_REM"} as Record<number,string>)[stage.stage];if(value)intervals.push({value,startDate:stage.startTime,endDate:stage.endTime,sourceId:session.metadata?.dataOrigin??"health-connect"});}}result.sleepNights.push(...appleSleepNights(intervals).map(n=>({...n,id:n.id.replace("apple-health","health-connect"),source:"google_health" as const})));}catch{/* No recorded staging, no invented asleep duration. */}
 result.dailyHealth.push(row);
 }
 return result;
}
