import {it,expect} from "vitest";
import {appleHealthExtra,appleSleepNights,androidHealthExtra} from "./device-health-metrics";
it("unions duplicate sleep intervals and excludes in-bed time",()=>{
 const samples=[{value:"ASLEEP_CORE",startDate:"2026-10-30T02:00:00Z",endDate:"2026-10-30T09:00:00Z",sourceId:"watch"},{value:"ASLEEP",startDate:"2026-10-30T02:00:00Z",endDate:"2026-10-30T09:00:00Z",sourceId:"watch"},{value:"INBED",startDate:"2026-10-30T01:00:00Z",endDate:"2026-10-30T10:00:00Z"}];
 expect(appleSleepNights(samples)).toMatchObject([{day:"2026-10-30",durationMin:420,lightMin:420}]);
});
it("converts HealthKit HRV seconds to milliseconds without fabricating other metrics",async()=>{
 const result=await appleHealthExtra({getHeartRateVariabilitySamples:(_options:unknown,callback:Function)=>callback(null,[{value:.05,startDate:"2026-10-30T12:00:00Z"}])},"2026-10-29","2026-10-31");
 expect(result.dailyHealth).toEqual([{provider:"apple_health",day:"2026-10-30",hrv:50}]);
});
it("does not query ungranted Android health metrics",async()=>{
 const result=await androidHealthExtra({requestPermission:async()=>[]});
 expect(result.dailyHealth.every(r=>r.steps==null&&r.restingHr==null&&r.hrv==null)).toBe(true);
 expect(result.sleepNights).toEqual([]);
});
