import Link from "next/link";
import { AppHeading } from "@/ui/section";
import { notFound } from "next/navigation";
import { loadRaceReport } from "@/lib/race-results";
import { raceClock, raceSourceUrl, RACE_DISTANCES, RACE_CATEGORIES } from "@fitness-battle/shared";
export const dynamic = "force-dynamic";
export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId < 1) notFound();
  let report;
  try { report = await loadRaceReport(numericId); }
  catch { return <main className="rankings-wrap"><AppHeading level={1} role="display">Result unavailable</AppHeading><p>Please try again in a moment.</p><Link href={`/rankings/result/${id}`}>Retry</Link></main>; }
  if (!report) notFound();
  const r = report.result;
  const distance = RACE_DISTANCES.find(d => d.stored === r.distance_slug);
  const source = raceSourceUrl(r.source_url);
  const highest = Math.max(...report.bins.map(b => b.count), 1);
  const selectedBin = Math.floor((r.rank_time_ms - report.minimumMs) / report.binWidthMs);
  return <main className="rankings-wrap">
    <header className="rankings-top"><Link href={`/rankings/${distance?.slug ?? "marathon"}?sex=${r.sex}&year=${r.edition_year}`}>← {distance?.label} results</Link><span className="rankings-kicker">Race report</span></header>
    <p className="rankings-kicker">{r.event_name} · {r.edition_year}</p><AppHeading level={1} role="display" className="race-athlete-name">{r.athlete_name}</AppHeading>
    <div className="race-report-hero"><strong>{raceClock(r.rank_time_ms)}</strong><span>{r.rank_clock === "chip" ? "Chip time" : "Official time"} · {RACE_CATEGORIES.find(c => c.value === r.sex)?.label}{r.bib ? ` · #${r.bib}` : ""}</span></div>
    <section className="race-report-metrics" aria-label="Result context"><div><span>Recorded field rank</span><strong>{report.place.toLocaleString()} <small>/ {report.total.toLocaleString()}</small></strong></div><div><span>Field median</span><strong>{raceClock(report.medianMs)}</strong></div></section>
    <section className="race-distribution"><AppHeading level={2} role="heading">Your place in the field</AppHeading><p className="rankings-note">Published results from this edition and category. Import completeness has not been verified; these are not official placements or worldwide percentiles.</p>
      <div className="race-histogram" role="img" aria-label={`Finish-time distribution. Selected time ${raceClock(r.rank_time_ms)}; median ${raceClock(report.medianMs)}.`}>
        {Array.from({length: Math.max(...report.bins.map(b => b.bucket), 0) + 1}, (_, bucket) => {
          const count = report.bins.find(b => b.bucket === bucket)?.count ?? 0;
          return <div key={bucket} className={bucket === selectedBin ? "selected" : ""} style={{height:`${Math.max(count ? 2 : 0, count / highest * 100)}%`}} title={`${raceClock(report.minimumMs + bucket * report.binWidthMs)} · ${count} results`} />;
        })}
      </div><div className="race-chart-axis"><span>{raceClock(report.minimumMs)}</span><span>{raceClock(report.minimumMs + (Math.max(...report.bins.map(b => b.bucket), 0) + 1) * report.binWidthMs)}</span></div>
      <details><summary>Distribution values</summary><ul>{report.bins.map(b => <li key={b.bucket}>{raceClock(report.minimumMs+b.bucket*report.binWidthMs)}–{raceClock(report.minimumMs+(b.bucket+1)*report.binWidthMs)}: {b.count.toLocaleString()} results</li>)}</ul></details>
    </section>
    <section className="race-neighbors"><AppHeading level={2} role="heading">Nearby finishers</AppHeading>{report.neighbors.map(n => <Link key={n.id} href={`/rankings/result/${n.id}`}><span>{n.athlete_name}</span><strong>{raceClock(n.rank_time_ms)}</strong></Link>)}{!report.neighbors.length && <p>No other results in this field.</p>}</section>
    <footer className="rankings-source">{r.attribution}{source && <> · <a href={source} target="_blank" rel="noreferrer">View source ↗</a></>}</footer>
  </main>;
}
