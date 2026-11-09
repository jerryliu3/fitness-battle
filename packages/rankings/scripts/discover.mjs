import {register} from "node:module";
import {resolve} from "node:path";
import {createHash} from "node:crypto";
import {providerJson} from "./lib/provider.mjs";
import {readJson,writeJson,withFileLock} from "./lib/files.mjs";
register("./ts-resolve.mjs",import.meta.url);
const {parseUpdatedRaceSets,mergeRaceCandidates,updatedRaceSetsUrl,parseDiscoveryState}=await import("../src/index.ts");
const argv=process.argv.slice(2);
const flag=name=>{const index=argv.indexOf(name);if(index<0) return null;if(!argv[index+1] || argv[index+1].startsWith("--")) throw new Error(`Missing ${name}`);return argv[index+1];};
const path=resolve(flag("--state") ?? ".local/rankings/discovery.json");
const reportPath=resolve(flag("--report") ?? ".local/rankings/discovery-report.json");
if(path===reportPath) throw new Error("Checkpoint and report must use different paths");
await withFileLock(path,async()=>{
  const report={startedAt:new Date().toISOString(),status:"failed",pages:0,candidates:0};
  try {
    const previous=parseDiscoveryState(await readJson(path,{version:1,cursorUntil:0,candidates:[]}));
    const until=Number(flag("--until") ?? Math.floor(Date.now()/1000));
    const since=Number(flag("--since") ?? (previous.cursorUntil ? Math.max(0,previous.cursorUntil-86400) : NaN));
    if(until>Math.floor(Date.now()/1000)) throw new Error("Discovery window cannot end in the future");
    updatedRaceSetsUrl(since,until,1,1000); // Validate before requests; first run needs an explicit window.
    if(until<previous.cursorUntil) throw new Error("Discovery cannot move its checkpoint backwards");
    const seen=new Set();let candidates=previous.candidates;let complete=false;
    for(let page=1;page<=100;page++) {
      const rows=parseUpdatedRaceSets(await providerJson(updatedRaceSetsUrl(since,until,page,1000)));
      if(rows.length>1000) throw new Error("Provider exceeded the requested page size");
      if(rows.some(row=>row.modifiedAt<since || row.modifiedAt>until)) throw new Error("Provider returned results outside the requested window");
      const signature=createHash("sha256").update(JSON.stringify(rows.map(r=>[r.key,r.modifiedAt]).sort())).digest("hex");
      if(rows.length && seen.has(signature)) throw new Error("Provider repeated a page; checkpoint unchanged");
      seen.add(signature);candidates=mergeRaceCandidates(candidates,rows);report.pages=page;
      if(rows.length<1000) {complete=true;break;}
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    if(!complete) throw new Error("Discovery reached its page limit; checkpoint unchanged");
    await writeJson(path,{version:1,cursorUntil:until,candidates});
    Object.assign(report,{status:"succeeded",since,until,candidates:candidates.length});
  } catch(error) {report.error=error instanceof Error ? error.message : "Discovery failed";process.exitCode=1;}
  report.finishedAt=new Date().toISOString();await writeJson(reportPath,report);
  process.stdout.write(JSON.stringify(report)+"\n");
});
