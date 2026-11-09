import {createHash} from "node:crypto";
import {ROAD_DISTANCES,type RoadDistance} from "../fingerprint";
import {raceCandidateKey,type RaceCandidate} from "./discovery";
export type RefreshMapping = {
  raceId:string;eventId:string;resultSetId:string;distance:RoadDistance;
  name:string;editionYear:number;date:string;attribution:string;reuseNotes:string;reviewedAt:string;
};
function record(value:unknown):Record<string,unknown> {
  if(!value || typeof value!=="object" || Array.isArray(value)) throw new Error("Invalid refresh configuration");
  return value as Record<string,unknown>;
}
function id(value:unknown) {
  if(typeof value!=="string" || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value)<=0) throw new Error("Refresh identifiers must be positive numeric strings");
  return String(Number(value));
}
export function parseRefreshCatalog(value:unknown):RefreshMapping[] {
  const catalog=record(value);
  if(catalog.version!==1 || !Array.isArray(catalog.events)) throw new Error("Invalid refresh catalog version or events");
  const seen=new Set<string>();
  return catalog.events.map(value=>{
    const row=record(value),raceId=id(row.raceId),eventId=id(row.eventId),resultSetId=id(row.resultSetId);
    const key=raceCandidateKey(raceId,eventId,resultSetId);
    if(seen.has(key)) throw new Error("Duplicate refresh mapping");seen.add(key);
    if(typeof row.distance!=="string" || !ROAD_DISTANCES.includes(row.distance as RoadDistance)) throw new Error("Unknown refresh distance");
    for(const field of ["name","attribution","reuseNotes","reviewedAt"]) {
      if(typeof row[field]!=="string" || !(row[field] as string).trim() || (row[field] as string).startsWith("--")) throw new Error(`Refresh mapping requires ${field}`);
    }
    if(typeof row.editionYear!=="number" || !Number.isInteger(row.editionYear) || row.editionYear<1900 || row.editionYear>2100
      || typeof row.date!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(Date.parse(row.date))
      || new Date(row.date).toISOString().slice(0,10)!==row.date || Number(row.date.slice(0,4))!==row.editionYear
      || !Number.isFinite(Date.parse(row.reviewedAt as string))) throw new Error("Invalid reviewed edition dates");
    return {raceId,eventId,resultSetId,distance:row.distance as RoadDistance,name:(row.name as string).trim(),editionYear:row.editionYear,
      date:row.date,attribution:(row.attribution as string).trim(),reuseNotes:(row.reuseNotes as string).trim(),reviewedAt:row.reviewedAt as string};
  });
}
export function refreshMappingHash(mapping:RefreshMapping) {return createHash("sha256").update(JSON.stringify(mapping)).digest("hex");}
export type PreparedRace = {modifiedAt:number;mappingHash:string;sqlPath:string;jsonlPath:string;preparedAt:string};
export function planRaceRefresh(candidates:RaceCandidate[],mappings:RefreshMapping[],prepared:Record<string,PreparedRace>) {
  const catalog=new Map(mappings.map(row=>[raceCandidateKey(row.raceId,row.eventId,row.resultSetId),row]));
  return candidates.flatMap(candidate=>{
    const mapping=catalog.get(candidate.key);if(!mapping) return [];
    const previous=prepared[candidate.key],mappingHash=refreshMappingHash(mapping);
    return !previous || previous.modifiedAt<candidate.modifiedAt || previous.mappingHash!==mappingHash
      ? [{key:candidate.key,modifiedAt:candidate.modifiedAt,mappingHash,mapping}] : [];
  }).sort((a,b)=>a.modifiedAt-b.modifiedAt || a.key.localeCompare(b.key));
}
export function publicFinalResultSet(payload:unknown,resultSetId:string) {
  const data=record(payload);
  if(!Array.isArray(data.individual_results_sets)) throw new Error("Provider result-set metadata is unavailable");
  const row=data.individual_results_sets.map(record).find(row=>String(row.individual_result_set_id)===resultSetId);
  if(!row || row.public_results!=="T") throw new Error("Result set is not explicitly public");
  if(row.preliminary_results!=="F") throw new Error("Result set is preliminary or its final status is unknown");
  if(typeof row.num_finishers!=="number" || !Number.isSafeInteger(row.num_finishers) || row.num_finishers<1) throw new Error("Provider finisher count is unavailable");
  return {count:row.num_finishers};
}
