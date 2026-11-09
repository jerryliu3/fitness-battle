"use client";

import Link from "next/link";
import { AppHeading } from "@/ui/section";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RACE_CATEGORIES, RACE_DISTANCES, raceClock, type RaceResultsPage, type raceQuery } from "@fitness-battle/shared";

type Query = ReturnType<typeof raceQuery>;
export function RaceExplorer({ distance, initial, query }: { distance: string; initial: RaceResultsPage | null; query: Query }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.query);
  const [sex, setSex] = useState(query.sex);
  const [year, setYear] = useState(query.year?.toString() ?? "");
  function navigate(page: number) {
    const changed = sex !== query.sex || search.trim() !== query.query || year !== (query.year?.toString() ?? "");
    const params = new URLSearchParams({ sex, page: String(changed ? 1 : page) });
    if (search.trim()) params.set("q", search.trim());
    if (year) params.set("year", year);
    startTransition(() => router.push(`/rankings/${distance}?${params}`, { scroll: false }));
  }
  const data = initial;
  return <div className="race-explorer" aria-busy={pending}>
    <nav className="race-distances" aria-label="Race distance">{RACE_DISTANCES.map(d => <Link aria-current={distance === d.slug ? "page" : undefined} key={d.slug} href={`/rankings/${d.slug}?sex=${query.sex}`}>{d.label}</Link>)}</nav>
    <form className="race-filters" onSubmit={event => { event.preventDefault(); navigate(1); }}>
      <label className="race-search">Athlete or bib<input name="q" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a finisher…" maxLength={100} /></label>
      <label>Category<select value={sex} onChange={e => setSex(e.target.value)}>{RACE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
      <label>Year<input aria-label="Edition year" type="number" min="1900" max="2100" value={year} onChange={e => setYear(e.target.value)} placeholder="All years" /></label>
      <button type="submit" disabled={pending}>{pending ? "Finding…" : "Find results"}</button>
    </form>
    {!data ? <div className="race-empty" role="alert"><AppHeading level={2} role="heading">Results are unavailable</AppHeading><p>Please try again in a moment.</p><button onClick={() => startTransition(() => router.refresh())}>Retry</button></div> : <>
      <div className="race-summary" aria-live="polite"><div><strong>{data.total.toLocaleString()}</strong><span>{query.query ? "matching results" : "published results"}</span></div><p>{query.year ?? "All covered years"} · {RACE_CATEGORIES.find(c => c.value === query.sex)?.label}<br/>Chip time where available, otherwise official time</p></div>
      {data.rows.length === 0 ? <div className="race-empty"><AppHeading level={2} role="heading">{query.query ? "No matching finishers" : "No results in this field"}</AppHeading><p>Try another name, category or year.</p></div> : <>
        <div className="race-table" role="region" aria-label="Race results" tabIndex={0}>
          <table><caption className="sr-only">Rank within {data.cohortTotal.toLocaleString()} published results in the selected category and timeframe</caption><thead><tr><th scope="col">Rank</th><th scope="col">Athlete</th><th scope="col">Finish</th><th scope="col" className="race-event-column">Event</th></tr></thead><tbody>
            {data.rows.map(row => <tr key={row.id}><td className="race-place">{row.place.toLocaleString()}</td><td><Link className="race-result-link" href={`/rankings/result/${row.id}`}>{row.athlete_name}</Link><span className="race-mobile-event">{row.event_name}</span>{row.bib && <small>#{row.bib}</small>}</td><td className="race-time">{raceClock(row.rank_time_ms)}<small>{row.rank_clock === "chip" ? "Chip" : "Official"}</small></td><td className="race-event-column">{row.event_name}<small>{row.edition_year}</small></td></tr>)}
          </tbody></table>
        </div>
        <nav className="race-pagination" aria-label="Results pages"><button disabled={pending || data.page <= 1} onClick={() => navigate(data.page - 1)}>← Previous</button><span>{((data.page - 1) * data.pageSize + 1).toLocaleString()}–{Math.min(data.page * data.pageSize, data.total).toLocaleString()} of {data.total.toLocaleString()}</span><button disabled={pending || data.page * data.pageSize >= data.total} onClick={() => navigate(data.page + 1)}>Next →</button></nav>
        <form className="race-jump" onSubmit={e => { e.preventDefault(); const value = new FormData(e.currentTarget).get("page"); navigate(Number(value)); }}><label>Go to page <input type="number" name="page" min="1" max={Math.ceil(data.total / data.pageSize)} required defaultValue={data.page} /></label><button disabled={pending}>Go</button></form>
        <p className="rankings-source">{[...new Set(data.rows.map(r => r.attribution))].join(" · ")}</p>
      </>}
    </>}
  </div>;
}
