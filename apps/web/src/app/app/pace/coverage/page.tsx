import Link from "next/link";
import { AppHeading } from "@/ui/section";
import { loadRaceCoverage } from "@/lib/race-results";
import { RACE_CATEGORY_FILTERS, RACE_DISTANCES, raceEventGroups, raceQuery } from "@fitness-battle/shared";

export const dynamic = "force-dynamic";

export default async function CoveragePage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const { query, sex } = raceQuery({ get: key => typeof raw[key] === "string" ? raw[key] : null });
  const distance = RACE_DISTANCES.find(option => option.slug === raw.distance);
  let coverage;
  try {
    coverage = await loadRaceCoverage();
  } catch {
    return <main className="rankings-wrap"><AppHeading level={1} role="display">Events unavailable</AppHeading><Link href="/app/pace/coverage">Retry</Link></main>;
  }
  const groups = raceEventGroups(coverage, sex, query).filter(row => !distance || row.distance_slug === distance.stored);

  return <main className="rankings-wrap race-explorer">
    <header className="rankings-top"><Link href="/app/pace">← Times</Link></header>
    <AppHeading level={1} role="display">Race events</AppHeading>
    <form className="race-filters" method="get">
      <label className="race-search">Race name or year<input name="q" type="search" maxLength={100} defaultValue={query} /></label>
      <label>Distance<select name="distance" defaultValue={distance?.slug ?? ""}><option value="">All distances</option>{RACE_DISTANCES.map(option => <option key={option.slug} value={option.slug}>{option.label}</option>)}</select></label>
      <label>Category<select name="sex" defaultValue={sex}>{RACE_CATEGORY_FILTERS.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}</select></label>
      <button>Find events</button>
    </form>
    <div className="race-coverage-list">
      {groups.map(row => {
        const raceDistance = RACE_DISTANCES.find(option => option.stored === row.distance_slug);
        if (!raceDistance) return null;
        const scope = new URLSearchParams({ distance: raceDistance.slug, edition: String(row.edition_id), sex });
        return <article key={`${row.edition_id}:${row.distance_slug}`}>
          <AppHeading level={2} role="heading"><Link href={`/app/pace?${scope}`}>{row.event_name}</Link></AppHeading>
          <p>{raceDistance.label} · {row.edition_year}</p>
          <strong>{row.published_count.toLocaleString()} published finishes</strong>
          <p><Link href={`/app/pace/history?${scope}`}>Compare years</Link> · <Link href={`/app/pace/replay?${scope}`}>Replay options</Link></p>
          <p className="rankings-note">{row.reviewedCount} of {row.categoryCount} categories reviewed{row.undated_count ? ` · ${row.undated_count.toLocaleString()} undated results` : ""}</p>
          {row.evidenceUrls.map((url, index) => <p key={url}><a href={url} target="_blank" rel="noreferrer">Review source {row.evidenceUrls.length > 1 ? index + 1 : ""} ↗</a></p>)}
        </article>;
      })}
      {!groups.length && <p>No events match these filters.</p>}
    </div>
  </main>;
}
