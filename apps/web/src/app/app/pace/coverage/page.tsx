import Link from "next/link";
import {AppHeading} from "@/ui/section";
import {loadRaceCoverage} from "@/lib/race-results";
import {RACE_CATEGORY_FILTERS,RACE_DISTANCES,raceEventGroups,raceQuery} from "@fitness-battle/shared";
export const dynamic="force-dynamic";
export default async function CoveragePage({searchParams}:{searchParams:Promise<{sex?:string}>}) {
  const raw=await searchParams,sex=raceQuery(new URLSearchParams({sex:raw.sex ?? "all"})).sex;
  let coverage;
  try {coverage=await loadRaceCoverage();}
  catch {return <main className="rankings-wrap"><AppHeading level={1} role="display">Coverage unavailable</AppHeading><Link href="/pace/coverage">Retry</Link></main>;}
  const groups=raceEventGroups(coverage,sex);
  return <main className="rankings-wrap"><header className="rankings-top"><Link href="/pace">← Times</Link></header><AppHeading level={1} role="display">Events & coverage</AppHeading><p className="rankings-note">Each race appears once per distance. Filter the recorded results by category; coverage reviews remain specific to each category.</p>
    <form className="race-filters" method="get"><label>Category<select name="sex" defaultValue={sex}>{RACE_CATEGORY_FILTERS.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label><button>Apply filter</button></form>
    <div className="race-coverage-list">{groups.map(row=>{const distance=RACE_DISTANCES.find(d=>d.stored===row.distance_slug);return <article key={`${row.edition_id}:${row.distance_slug}`}><AppHeading level={2} role="heading"><Link href={`/pace?distance=${distance?.slug ?? "marathon"}&edition=${row.edition_id}&sex=${sex}`}>{row.event_name}</Link></AppHeading><p>{distance?.label} · {row.edition_year}</p><strong>{row.published_count.toLocaleString()} published results</strong><p className="rankings-note">{row.reviewedCount} of {row.categoryCount} included categories reviewed{row.undated_count ? ` · ${row.undated_count.toLocaleString()} undated results` : ""}</p>{row.evidenceUrls.map((url,i)=><p key={url}><a href={url} target="_blank" rel="noreferrer">Review source {row.evidenceUrls.length>1 ? i+1 : ""} ↗</a></p>)}</article>;})}{!groups.length && <p>No published results in this category.</p>}</div>
  </main>;
}
