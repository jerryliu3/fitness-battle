import {register} from "node:module";
import {access} from "node:fs/promises";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {readJson,writeJson,withFileLock} from "./lib/files.mjs";
register("./ts-resolve.mjs",import.meta.url);
const {parseDiscoveryState,parseRefreshCatalog,planRaceRefresh}=await import("../src/index.ts");
const argv=process.argv.slice(2);
const flag=name=>{const index=argv.indexOf(name);if(index<0) return null;if(!argv[index+1] || argv[index+1].startsWith("--")) throw new Error(`Missing ${name}`);return argv[index+1];};
const statePath=resolve(flag("--state") ?? ".local/rankings/refresh.json");
const discoveryPath=resolve(flag("--discovery") ?? ".local/rankings/discovery.json");
const reportPath=resolve(flag("--report") ?? ".local/rankings/refresh-report.json");
const catalogPath=resolve(flag("--catalog") ?? "packages/rankings/config/runsignup-events.json");
if(new Set([statePath,discoveryPath,reportPath,catalogPath]).size!==4) throw new Error("State, discovery, catalog and report must use distinct paths");
const limit=Number(flag("--limit") ?? 5);
if(!Number.isInteger(limit) || limit<1 || limit>20) throw new Error("Refresh limit must be from 1 to 20");
await withFileLock(statePath,async()=>{
  const report={startedAt:new Date().toISOString(),mode:argv.includes("--plan") ? "plan" : "prepare",status:"failed",jobs:[]};
  try {
    const discovery=parseDiscoveryState(await readJson(discoveryPath,null));
    const catalog=parseRefreshCatalog(await readJson(catalogPath,null));
    const state=await readJson(statePath,{version:1,prepared:{}});
    if(state?.version!==1 || !state.prepared || typeof state.prepared!=="object" || Array.isArray(state.prepared)) throw new Error("Invalid refresh checkpoint");
    for(const [key,value] of Object.entries(state.prepared)) {
      if(!/^runsignup:\d+:\d+:\d+$/.test(key) || !value || !Number.isSafeInteger(value.modifiedAt) || value.modifiedAt<0
        || typeof value.mappingHash!=="string" || !/^[a-f0-9]{64}$/.test(value.mappingHash) || typeof value.sqlPath!=="string" || typeof value.jsonlPath!=="string") throw new Error("Invalid prepared-job checkpoint");
      try {await access(value.sqlPath);await access(value.jsonlPath);} catch {delete state.prepared[key];}
    }
    const jobs=planRaceRefresh(discovery.candidates,catalog,state.prepared);
    report.unmapped=discovery.candidates.filter(candidate=>!catalog.some(mapping=>candidate.key===`runsignup:${mapping.raceId}:${mapping.eventId}:${mapping.resultSetId}`)).length;
    report.due=jobs.length;
    for(const job of jobs.slice(0,limit)) {
      const entry={key:job.key,modifiedAt:job.modifiedAt,status:"planned"};
      report.jobs.push(entry);
      if(argv.includes("--plan")) continue;
      const mapping=job.mapping;
      const outputDir=resolve(dirname(statePath),"prepared",`${mapping.raceId}-${mapping.eventId}-${mapping.resultSetId}`,`${job.modifiedAt}-${job.mappingHash.slice(0,12)}`);
      const childReport=resolve(outputDir,"import-report.json");
      try {
        await promisify(execFile)(process.execPath,[fileURLToPath(new URL("./ingest.mjs",import.meta.url)),
          "--runsignup",mapping.raceId,"--event",mapping.eventId,"--result-set",mapping.resultSetId,
          "--distance",mapping.distance,"--name",mapping.name,"--year",String(mapping.editionYear),"--date",mapping.date,
          "--output-dir",outputDir,"--attribution",mapping.attribution,"--reuse-notes",mapping.reuseNotes,"--provider-auth","--prepare-only","--report",childReport],
          {env:{...process.env,RANKINGS_DATABASE_URL:""},timeout:600000,maxBuffer:1024*1024});
        const output=await readJson(childReport,null);
        const event=output?.events?.[0];
        if(output?.apply!=="prepared_only" || event?.status!=="succeeded" || !event.sql || !event.jsonl) throw new Error();
        state.prepared[job.key]={modifiedAt:job.modifiedAt,mappingHash:job.mappingHash,sqlPath:event.sql,jsonlPath:event.jsonl,preparedAt:new Date().toISOString()};
        await writeJson(statePath,state);entry.status="prepared";entry.results=event.results;
      } catch {entry.status="failed";entry.error="Import preparation failed; checkpoint was not advanced. Re-run the mapped import locally to inspect the provider error.";process.exitCode=1;}
    }
    report.status=process.exitCode ? "failed" : "succeeded";
  } catch(error) {report.error=error instanceof Error ? error.message : "Refresh failed";process.exitCode=1;}
  report.finishedAt=new Date().toISOString();await writeJson(reportPath,report);
  process.stdout.write(JSON.stringify(report)+"\n");
});
