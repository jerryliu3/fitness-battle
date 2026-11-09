import Link from "next/link";
import {AppHeading} from "@/ui/section";
import {RACE_DISTANCES,RACE_CATEGORIES,raceQuery,raceClock} from "@fitness-battle/shared";
import {loadEditionHistory} from "@/lib/race-results";
export const dynamic="force-dynamic";
export default async function EditionHistory({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const raw=await searchParams,params=new URLSearchParams();
  for(const [key,value] of Object.entries(raw)) if(typeof value==="string") params.set(key,value);
  const query=raceQuery(params),distance=RACE_DISTANCES.find(d=>d.slug===params.get("distance"));
  let rows=null;
  try {if(distance && query.editionId && !query.editionError) rows=await loadEditionHistory(query.editionId,distance.stored,query.sex);} catch { /* Recovery below. */ }
  const maximum=Math.max(...(rows?.map(row=>row.median_ms) ?? []),1);
  return <main className="rankings-wrap"><Link href="/rankings">← Race rankings</Link><AppHeading level={1} role="display">Across editions</AppHeading><p className="rankings-note">{distance?.label} · {RACE_CATEGORIES.find(c=>c.value===query.sex)?.label}. Published records for the same event. Counts can reflect import coverage; courses, conditions and clock mixes may change. <Link href="/rankings/coverage">Check coverage</Link></p>
    {!rows ? <p role="alert">History unavailable. <Link href={`/rankings/history?${params}`}>Retry</Link></p> : !rows.length ? <p>No published editions in this field.</p> : <div className="race-coverage-list">{rows.map(row=><article key={row.edition_id}><AppHeading level={2} role="heading"><Link href={`/rankings/${distance?.slug}?edition=${row.edition_id}&sex=${query.sex}`}>{row.event_name} · {row.edition_year}</Link></AppHeading><p>{row.total.toLocaleString()} published finishes</p><strong>Median {raceClock(row.median_ms)}</strong><div className="race-pace-track" aria-hidden="true"><span style={{width:`${row.median_ms/maximum*100}%`}} /></div><p>Fastest {raceClock(row.fastest_ms)}</p><p className="rankings-note">{row.chip_count.toLocaleString()} chip · {row.official_count.toLocaleString()} official times</p></article>)}</div>}
  </main>;
}
