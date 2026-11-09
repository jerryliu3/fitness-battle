/** Provider metadata only: never fetches or stores participant rows. */
export type RaceCandidate = {
  key: string; raceId: string; eventId: string; resultSetId: string;
  raceName: string; resultSetName: string; modifiedAt: number;
};
export function raceCandidateKey(raceId: string,eventId: string,resultSetId: string) {
  return `runsignup:${raceId}:${eventId}:${resultSetId}`;
}
function object(value: unknown): Record<string,unknown> {
  if (!value || typeof value!=="object" || Array.isArray(value)) throw new Error("Invalid provider metadata object");
  return value as Record<string,unknown>;
}
function providerId(value: unknown) {
  const text=String(value);
  if (!/^\d+$/.test(text) || Number(text)<=0 || !Number.isSafeInteger(Number(text))) throw new Error("Invalid provider identifier");
  return String(Number(text));
}
export function parseUpdatedRaceSets(payload: unknown): RaceCandidate[] {
  const data=object(payload);
  if (!Array.isArray(data.result_sets)) throw new Error("Provider response is missing result_sets");
  return data.result_sets.map(value=>{
    const row=object(value);
    const raceId=providerId(row.race_id),eventId=providerId(row.event_id),resultSetId=providerId(row.individual_result_set_id);
    if (typeof row.race_name!=="string" || typeof row.individual_result_set_name!=="string"
      || typeof row.last_modified_ts!=="number" || !Number.isSafeInteger(row.last_modified_ts) || row.last_modified_ts<0)
      throw new Error("Invalid result-set metadata");
    return {key:raceCandidateKey(raceId,eventId,resultSetId),raceId,eventId,resultSetId,
      raceName:row.race_name.trim().slice(0,300),resultSetName:row.individual_result_set_name.trim().slice(0,300),modifiedAt:row.last_modified_ts};
  });
}
export function mergeRaceCandidates(previous: RaceCandidate[],incoming: RaceCandidate[]) {
  const rows=new Map(previous.map(row=>[row.key,row]));
  for (const row of incoming) {
    if (!rows.has(row.key) || rows.get(row.key)!.modifiedAt<=row.modifiedAt) rows.set(row.key,row);
  }
  return [...rows.values()].sort((a,b)=>a.key.localeCompare(b.key));
}
export function updatedRaceSetsUrl(since: number,until: number,page: number,pageSize: number) {
  if (![since,until,page,pageSize].every(Number.isSafeInteger) || since<0 || until<since || page<1 || pageSize<1 || pageSize>1000)
    throw new Error("Invalid discovery window or page");
  const url=new URL("https://api.runsignup.com/rest/v2/results/updated-result-sets.json");
  url.searchParams.set("modified_since_timestamp",String(since));url.searchParams.set("modified_until_timestamp",String(until));
  url.searchParams.set("page",String(page));url.searchParams.set("num_per_page",String(pageSize));
  return url.toString();
}
export type DiscoveryState = {version:1; cursorUntil:number; candidates:RaceCandidate[]};
export function parseDiscoveryState(value: unknown): DiscoveryState {
  const state=object(value);
  if (state.version!==1 || typeof state.cursorUntil!=="number" || !Number.isSafeInteger(state.cursorUntil) || state.cursorUntil<0 || !Array.isArray(state.candidates))
    throw new Error("Invalid discovery checkpoint");
  const candidates=state.candidates.map(value=>{
    const row=object(value);
    const parsed=parseUpdatedRaceSets({result_sets:[{race_id:row.raceId,event_id:row.eventId,individual_result_set_id:row.resultSetId,
      race_name:row.raceName,individual_result_set_name:row.resultSetName,last_modified_ts:row.modifiedAt}]})[0]!;
    if (parsed.key!==row.key) throw new Error("Invalid discovery candidate key");
    return parsed;
  });
  return {version:1,cursorUntil:state.cursorUntil,candidates:mergeRaceCandidates([],candidates)};
}
