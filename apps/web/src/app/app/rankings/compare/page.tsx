import Link from "next/link";
import { AppHeading } from "@/ui/section";
import { compareRaceResults, compareRaceSplits, raceClock, raceTimeGap, RACE_DISTANCES } from "@fitness-battle/shared";
import { loadRaceReport } from "@/lib/race-results";
export const dynamic = "force-dynamic";
export default async function CompareResults({searchParams}: {searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params = await searchParams;
  const ids = [params.first,params.second].map(value => typeof value === "string" ? Number(value) : NaN);
  const valid = ids.every(id => Number.isSafeInteger(id) && id > 0) && ids[0] !== ids[1];
  let rows;
  let failed = false;
  if (valid) { try { rows = (await Promise.all(ids.map(id=>loadRaceReport(id)))).flatMap(report=>report ? [{...report.result,splits:report.splits}] : []); } catch { failed = true; } }
  const first = rows?.find(row => row.id === ids[0]);
  const second = rows?.find(row => row.id === ids[1]);
  const comparison = first && second ? compareRaceResults(first,second) : null;
  const checkpoints=first && second ? compareRaceSplits(first,second) : null;
  const delta = comparison?.deltaMs;
  return <main className="rankings-wrap race-explorer"><header className="rankings-top"><Link href="/rankings/saved">← Saved results</Link><span className="rankings-kicker">Comparison</span></header><AppHeading level={1} role="display">Two performances</AppHeading>
    {!first || !second ? <div className="race-empty" role={failed ? "alert" : undefined}><AppHeading level={2} role="heading">{failed ? "Comparison unavailable" : "Choose two available results"}</AppHeading><p>{failed ? "Please try again in a moment." : "Select two published results from your saved list."}</p>{failed && <Link href={`/rankings/compare?first=${ids[0]}&second=${ids[1]}`}>Retry</Link>}</div> : <>
      <section className="race-comparison-grid" aria-label="Recorded performances">{[first,second].map(row => <article key={row.id}>
        <p className="rankings-kicker">{RACE_DISTANCES.find(d => d.stored === row.distance_slug)?.label} · {row.edition_year}</p><AppHeading level={2} role="heading"><Link href={`/rankings/result/${row.id}`}>{row.athlete_name}</Link></AppHeading><p className="race-comparison-time">{raceClock(row.rank_time_ms)}</p><p className="rankings-note">{row.event_name}<br/>{row.rank_clock === "chip" ? "Chip time" : "Official time"}</p>
        {!comparison?.reason && <div className="race-comparison-bar" aria-hidden="true"><div style={{width:`${row.rank_time_ms / Math.max(first.rank_time_ms,second.rank_time_ms) * 100}%`}} /></div>}
      </article>)}</section>
      <section className="race-comparison-gap" aria-label="Time comparison">{comparison?.reason ? <p>{comparison.reason}</p> : delta === 0 ? <><strong>Equal recorded times</strong><p>The two results have the same finish time.</p></> : <><strong>{raceTimeGap(delta ?? 0)}</strong><p>{(delta ?? 0) > 0 ? first.athlete_name : second.athlete_name}’s recorded time is faster.</p></>}</section>
      <section className="race-split-report"><AppHeading level={2} role="heading">Checkpoint gaps</AppHeading>{checkpoints?.reason ? <p className="rankings-note">{checkpoints.reason}</p> : <><p className="rankings-note">{checkpoints?.clock==="chip" ? "Chip" : "Official"} elapsed times at shared distances. Courses and conditions may differ; gaps do not establish live positions or overtakes.</p><div className="race-table"><table><thead><tr><th>Checkpoint</th><th>{first.athlete_name}</th><th>{second.athlete_name}</th><th>Second − first</th></tr></thead><tbody>{checkpoints?.rows.map(row=><tr key={row.distanceM}><th scope="row">{row.label}</th><td>{row.firstMs===null ? "Unavailable" : raceClock(row.firstMs)}</td><td>{row.secondMs===null ? "Unavailable" : raceClock(row.secondMs)}</td><td>{row.deltaMs===null ? "Unavailable" : row.deltaMs===0 ? "Equal" : `${row.deltaMs>0 ? "+" : "−"}${raceTimeGap(row.deltaMs)}`}</td></tr>)}</tbody></table></div></>}</section>
      <p className="rankings-note">Each time retains its source clock. Courses, conditions and fields may differ. This comparison does not adjust performance or establish athlete identity.</p>
    </>}
  </main>;
}
