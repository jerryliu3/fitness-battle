import {it,expect} from "vitest";
import {recordedSleep} from "./sleep";
it("uses the Eastern wake day, real duration/stages and rejects invalid nights",()=>{
 const n=recordedSleep("oura",{id:"one",end:"2026-10-25T03:30:00Z",durationSec:25200,deepSec:3600,remSec:5400});
 expect(n).toMatchObject({day:"2026-10-24",durationMin:420,deepMin:60,remMin:90,verified:true});
 expect(recordedSleep("whoop",{id:"bad",end:"invalid",durationSec:100})).toBeNull();
});
