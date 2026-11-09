"use client";

import Link from "next/link";
import { AppHeading } from "@/ui/section";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RACE_CATEGORIES, RACE_DISTANCES, RACE_TIMEFRAMES, raceClock, raceWindowCaption, raceEditionOptions, type RaceCoverage, type RaceResultsPage, type raceQuery } from "@fitness-battle/shared";

import { EditionAnalytics } from "./edition-analytics";

type Query = ReturnType<typeof raceQuery>;
export function RaceExplorer({ distance, initial, query, coverage }: { distance: string; initial: RaceResultsPage | null; query: Query; coverage: RaceCoverage[] | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [edition, setEdition] = useState(query.editionId?.toString() ?? "");
  const editions = raceEditionOptions(coverage ?? [], RACE_DISTANCES.find(d => d.slug === distance)!.stored);
  const selectedEdition = editions.find(e => e.edition_id === query.editionId);
  const [search, setSearch] = useState(query.query);
  const [sex, setSex] = useState(query.sex);
  const [year, setYear] = useState(query.year?.toString() ?? "");
  const [timeframe,setTimeframe] = useState<string>(query.timeframe);
  const [from,setFrom] = useState(query.from);
  const [through,setThrough] = useState(query.through);
  function navigate(page: number) {
    const changed = edition !== (query.editionId?.toString() ?? "") || sex !== query.sex || search.trim() !== query.query || year !== (query.year?.toString() ?? "") || timeframe !== query.timeframe || from !== query.from || through !== query.through;
    const params = new URLSearchParams({ sex, timeframe, page: String(changed ? 1 : page) });
    if (edition) params.set("edition", edition);
    if (search.trim()) params.set("q", search.trim());
    if (timeframe === "year" && year) params.set("year", year);
    if (timeframe === "custom") {params.set("from",from);params.set("through",through);}
    startTransition(() => router.push(`/rankings/${distance}?${params}`, { scroll: false }));
  }
  const data = initial;
  return <div className="race-explorer" aria-busy={pending}>
    <nav className="race-distances" aria-label="Race distance">{RACE_DISTANCES.map(d => <Link aria-current={distance === d.slug ? "page" : undefined} key={d.slug} href={`/rankings/${d.slug}?${new URLSearchParams({sex:query.sex,timeframe:query.timeframe,...(query.year ? {year:String(query.year)} : {}),...(query.timeframe === "custom" ? {from:query.from,through:query.through} : {})})}`}>{d.label}</Link>)}</nav>
    <p><Link href="/rankings/saved">Saved results →</Link></p>
    {coverage === null && <p className="rankings-note">Event selection is unavailable. <button onClick={() => startTransition(() => router.refresh())}>Retry</button></p>}
    <form className="race-filters" onSubmit={event => { event.preventDefault(); navigate(1); }}>
      <label className="race-search">Athlete or bib<input name="q" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a finisher…" maxLength={100} /></label>
      <label>Event edition<select value={edition} onChange={e => setEdition(e.target.value)}><option value="">All events</option>{edition && !editions.some(e => String(e.edition_id) === edition) && <option value={edition}>Selected event edition</option>}{editions.map(e => <option key={e.edition_id} value={e.edition_id}>{e.event_name} · {e.edition_year}</option>)}</select></label>
      <label>Category<select value={sex} onChange={e => setSex(e.target.value)}>{RACE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
      <label>Timeframe<select value={timeframe} onChange={e => setTimeframe(e.target.value)}>{RACE_TIMEFRAMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
      {timeframe === "year" && <label>Year<input aria-label="Edition year" type="number" min="1900" max="2100" value={year} onChange={e => setYear(e.target.value)} placeholder="2025" required /></label>}
      {timeframe === "custom" && <><label>From<input type="date" min="1900-01-01" max="2100-12-31" value={from} onChange={e => setFrom(e.target.value)} required /></label><label>Through<input type="date" min={from || "1900-01-01"} max="2100-12-31" value={through} onChange={e => setThrough(e.target.value)} required /></label></>}
      <button type="submit" disabled={pending}>{pending ? "Finding…" : "Find results"}</button>
    </form>
    {query.editionId && <p className="race-edition-context">{selectedEdition ? `${selectedEdition.event_name} · ${selectedEdition.edition_year}` : "Selected event edition"}<span>Ranks apply to this edition, category and timeframe.</span></p>}
    {!data ? <div className="race-empty" role="alert"><AppHeading level={2} role="heading">{query.editionError ? "Check the event edition" : query.dateError ? "Check the timeframe" : "Results are unavailable"}</AppHeading><p>{query.editionError ?? query.dateError ?? "Please try again in a moment."}</p><button onClick={() => startTransition(() => router.refresh())}>Retry</button></div> : <>
      <div className="race-summary" aria-live="polite"><div><strong>{data.total.toLocaleString()}</strong><span>{query.query ? "matching results" : "published results"}</span></div><p>{query.timeframe === "year" ? query.year : RACE_TIMEFRAMES.find(t => t.value === query.timeframe)?.label} · {RACE_CATEGORIES.find(c => c.value === query.sex)?.label}<br/>Chip time where available, otherwise official time</p></div>
      {data.windowFrom && data.windowUntil && <p className="rankings-note">{raceWindowCaption(data)} · Undated results excluded.</p>}
      {data.analytics && <EditionAnalytics analytics={data.analytics} />}
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
