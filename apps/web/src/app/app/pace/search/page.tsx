import Link from "next/link";
import { RACE_CATEGORY_FILTERS, RACE_DISTANCES, raceClock, racePercentileBadge, raceQuery } from "@fitness-battle/shared";
import { loadRaceResults } from "@/lib/race-results";
import { AppHeading } from "@/ui/section";

export const dynamic = "force-dynamic";

export default async function PaceSearch({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = raceQuery({ get: key => ["q", "sex", "year"].includes(key) && typeof raw[key] === "string" ? raw[key] : null });
  const results = query.query && !query.dateError
    ? await Promise.allSettled(RACE_DISTANCES.map(distance => loadRaceResults(distance.stored, query)))
    : null;

  return <main className="rankings-wrap race-explorer">
    <Link href="/app/pace">← Times</Link>
    <AppHeading level={1} role="display">Find an athlete</AppHeading>
    <p className="rankings-note">Search published finishes across all four distances. Matches may belong to different people with the same name.</p>
    <form className="race-filters" method="get">
      <label className="race-search">Athlete or bib<input name="q" type="search" maxLength={100} defaultValue={query.query} required /></label>
      <label>Category<select name="sex" defaultValue={query.sex}>{RACE_CATEGORY_FILTERS.map(category =>
        <option key={category.value} value={category.value}>{category.label}</option>
      )}</select></label>
      <label>Edition year<input type="number" name="year" min={1900} max={2100} defaultValue={query.year ?? ""} /></label>
      <button>Find finishes</button>
    </form>
    {query.dateError && <p role="alert">{query.dateError}</p>}
    {results?.map((result, index) => {
      const distance = RACE_DISTANCES[index];
      const params = new URLSearchParams({ q: query.query, sex: query.sex, distance: distance.slug });
      if (query.year) params.set("year", String(query.year));
      return <section key={distance.slug} className="race-neighbors">
        <AppHeading level={2} role="heading">{distance.label}</AppHeading>
        {result.status === "rejected" ? <p>Results are unavailable for this distance.</p> :
          result.value.total === 0 ? <p>No matching finishes.</p> : <>
            <p className="rankings-note">{result.value.total.toLocaleString()} matches · Ranked within {result.value.cohortTotal.toLocaleString()} published finishes</p>
            {result.value.rows.slice(0, 5).map(row => <Link key={row.id} href={`/app/pace/result/${row.id}`}>
              <span>{row.athlete_name}<small> · {row.event_name} · {row.edition_year}</small></span>
              <strong>{raceClock(row.rank_time_ms)} · #{row.place.toLocaleString()}{row.percentile != null && ` · ${racePercentileBadge(row.percentile)}`}</strong>
            </Link>)}
            <Link href={`/app/pace?${params}`}>Open {distance.label} leaderboard →</Link>
          </>}
      </section>;
    })}
  </main>;
}
