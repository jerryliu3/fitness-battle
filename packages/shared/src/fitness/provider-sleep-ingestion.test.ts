import {it,expect} from "vitest";
import {pullWhoop} from "./whoop-provider";
import {pullOura} from "./oura-provider";
it("imports scored WHOOP sleep stages without treating recovery score as sleep",async()=>{
 const http={fetch:async(input:string|URL)=>Response.json({records:String(input).includes("activity/sleep")?[{id:"night",end:"2026-10-30T12:00:00Z",nap:false,score_state:"SCORED",score:{stage_summary:{total_light_sleep_time_milli:14400000,total_slow_wave_sleep_time_milli:3600000,total_rem_sleep_time_milli:7200000,total_awake_time_milli:600000}}}]:[]})};
 const result=await pullWhoop("token","2026-10-29","2026-10-31",http);
 expect(result.sleepNights).toMatchObject([{source:"whoop",durationMin:420,deepMin:60,remMin:120}]);
});
it("imports Oura sleep duration and stages independently of daily readiness",async()=>{
 const http={fetch:async(input:string|URL)=>Response.json({data:String(input).includes("/sleep?")?[{id:"night",type:"long_sleep",day:"2026-10-30",bedtime_end:"2026-10-30T12:00:00Z",total_sleep_duration:25200,deep_sleep_duration:3600,rem_sleep_duration:7200,average_hrv:50,lowest_heart_rate:48}]:[]})};
 const result=await pullOura("token","2026-10-29","2026-10-31",http);
 expect(result.sleepNights).toMatchObject([{source:"oura",durationMin:420,deepMin:60,remMin:120}]);
 expect(result.dailyHealth).toMatchObject([{hrv:50}]);
});
