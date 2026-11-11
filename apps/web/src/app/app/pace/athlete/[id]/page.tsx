import Link from "next/link";
import {notFound} from "next/navigation";
import {AppHeading} from "@/ui/section";
import {RACE_DISTANCES,raceClock,racePercentLabel,raceQuery} from "@fitness-battle/shared";
import {loadAthleteHistory} from "@/lib/race-results";
export const dynamic="force-dynamic";
export default async function AthleteHistory({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{page?:string}>}) {
  const id=Number((await params).id),query=await searchParams,page=raceQuery(new URLSearchParams({page:query.page ?? "1"})).page;
  if(!Number.isSafeInteger(id) || id<1) notFound();
  let history;
  try {history=await loadAthleteHistory(id,page);} catch {return <main className="rankings-wrap"><AppHeading level={1} role="display">History unavailable</AppHeading><Link href={`/pace/athlete/${id}?page=${page}`}>Retry</Link></main>;}
  if(!history) notFound();
  return <main className="rankings-wrap"><Link href="/pace">← Times</Link><AppHeading level={1} role="display">{history.name}</AppHeading><p className="rankings-note">{history.total.toLocaleString()} reviewed, linked performances. This history may be incomplete; bests describe these published records, separated by distance and clock.</p><div className="race-coverage-list">{history.bests.map(best=><article key={`${best.distance_slug}:${best.rank_clock}`}><AppHeading level={2} role="heading">{RACE_DISTANCES.find(d=>d.stored===best.distance_slug)?.label}</AppHeading><strong>{raceClock(best.time_ms)}</strong><p>{best.rank_clock==="chip" ? "Chip" : "Official"} best · {best.total} linked finishes{best.best_percentile != null ? ` · Top ${racePercentLabel(100 - best.best_percentile)} peak` : ""}</p></article>)}</div><section className="race-neighbors"><AppHeading level={2} role="heading">Performance history</AppHeading>{history.rows.map(row=><Link key={row.id} href={`/pace/result/${row.id}`}><span>{row.event_name} · {row.result_date ?? row.edition_year}<small> · {RACE_DISTANCES.find(d=>d.stored===row.distance_slug)?.label} · {row.rank_clock}{row.percentile != null ? ` · Top ${racePercentLabel(100 - row.percentile)}` : ""}</small></span><strong>{raceClock(row.rank_time_ms)}</strong></Link>)}</section><nav className="race-pagination" aria-label="Athlete history pages">{history.page>1 && <Link href={`?page=${history.page-1}`}>Previous</Link>}<span>Page {history.page} of {Math.ceil(history.total/history.pageSize)}</span>{history.page*history.pageSize<history.total && <Link href={`?page=${history.page+1}`}>Next</Link>}</nav></main>;
}
