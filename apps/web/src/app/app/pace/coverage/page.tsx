import Link from "next/link";
import { AppHeading } from "@/ui/section";
import { loadRaceCoverage } from "@/lib/race-results";
import { RACE_CATEGORIES,RACE_DISTANCES,raceSourceUrl } from "@fitness-battle/shared";
export const dynamic = "force-dynamic";
export default async function CoveragePage() {
  let coverage;
  try { coverage = await loadRaceCoverage(); }
  catch { return <main className="rankings-wrap"><AppHeading level={1} role="display">Coverage unavailable</AppHeading><Link href="/pace/coverage">Retry</Link></main>; }
  return <main className="rankings-wrap"><header className="rankings-top"><Link href="/pace">← Times</Link></header><AppHeading level={1} role="display">Results coverage</AppHeading><p className="rankings-note">Published adult-eligible finishes by edition and category. A complete field requires a source review; row counts alone do not verify coverage.</p>
    <div className="race-coverage-list">{coverage.map(row => { const distance = RACE_DISTANCES.find(d => d.stored === row.distance_slug); const evidence = row.evidence_url ? raceSourceUrl(row.evidence_url) : null;
      return <article key={`${row.edition_id}:${row.distance_slug}:${row.sex}`}><AppHeading level={2} role="heading"><Link href={`/pace?distance=${distance?.slug ?? "marathon"}&edition=${row.edition_id}&sex=${row.sex}`}>{row.event_name}</Link></AppHeading><p>{distance?.label} · {RACE_CATEGORIES.find(c => c.value === row.sex)?.label}</p><strong>{row.published_count.toLocaleString()} published results</strong><p className="rankings-note">{row.complete ? "Complete field reviewed" : row.expected_eligible_count !== null ? `Review needs reconciliation · expected ${row.expected_eligible_count.toLocaleString()} eligible finishes` : "Completeness not yet reviewed"}{row.undated_count > 0 ? ` · ${row.undated_count.toLocaleString()} results without dates` : ""}</p>{evidence && <a href={evidence} target="_blank" rel="noreferrer">Review source ↗</a>}</article>;
    })}{!coverage.length && <p>No published results yet.</p>}</div>
  </main>;
}
