"use client";

import Link from "next/link";
import { AppHeading } from "@/ui/section";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RACE_CATEGORY_FILTERS, RACE_DISTANCES, RACE_PERCENTILE_FILTERS, RACE_TIMEFRAMES, raceClock, raceWindowCaption, raceEditionOptions, type RaceCoverage, type RaceResultsPage, type raceQuery } from "@fitness-battle/shared";

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
  const [percentile, setPercentile] = useState(query.percentile ?? "all");
  const [year, setYear] = useState(query.year?.toString() ?? "");
  const [timeframe, setTimeframe] = useState<string>(query.timeframe);
  const [from, setFrom] = useState(query.from);
  const [through, setThrough] = useState(query.through);

  function executeNavigation(overrides?: Partial<{
    edition: string;
    sex: string;
    percentile: string;
    timeframe: string;
    year: string;
    from: string;
    through: string;
    search: string;
    page: number;
  }>) {
    const nextEdition = overrides?.edition !== undefined ? overrides.edition : edition;
    const nextSex = overrides?.sex !== undefined ? overrides.sex : sex;
    const nextPercentile = overrides?.percentile !== undefined ? overrides.percentile : percentile;
    const nextTimeframe = overrides?.timeframe !== undefined ? overrides.timeframe : timeframe;
    const nextYear = overrides?.year !== undefined ? overrides.year : year;
    const nextFrom = overrides?.from !== undefined ? overrides.from : from;
    const nextThrough = overrides?.through !== undefined ? overrides.through : through;
    const nextSearch = overrides?.search !== undefined ? overrides.search : search;
    const nextPage = overrides?.page !== undefined ? overrides.page : 1;

    const params = new URLSearchParams({
      sex: nextSex,
      timeframe: nextTimeframe,
      page: String(nextPage),
    });
    if (nextEdition) params.set("edition", nextEdition);
    if (nextSearch.trim()) params.set("q", nextSearch.trim());
    if (nextPercentile && nextPercentile !== "all") params.set("percentile", nextPercentile);
    if (nextTimeframe === "year" && nextYear) params.set("year", nextYear);
    if (nextTimeframe === "custom") {
      params.set("from", nextFrom);
      params.set("through", nextThrough);
    }
    startTransition(() => router.push(`/pace?distance=${distance}&${params}`, { scroll: false }));
  }

  const data = initial;
  return <div className="race-explorer" aria-busy={pending}>
    <nav className="race-distances" aria-label="Race distance">{RACE_DISTANCES.map(d => <Link aria-current={distance === d.slug ? "page" : undefined} key={d.slug} href={`/pace?distance=${d.slug}&${new URLSearchParams({sex:query.sex,timeframe:query.timeframe,...(query.percentile && query.percentile !== "all" ? {percentile:query.percentile} : {}),...(query.year ? {year:String(query.year)} : {}),...(query.timeframe === "custom" ? {from:query.from,through:query.through} : {})})}`}>{d.label}</Link>)}</nav>
    <p><Link href="/pace/saved">Saved results →</Link> · <Link href="/pace/coverage">Results coverage</Link></p>
    {coverage === null && <p className="rankings-note">Event selection is unavailable. <button onClick={() => startTransition(() => router.refresh())}>Retry</button></p>}
    <form className="race-filters" onSubmit={event => { event.preventDefault(); executeNavigation({ page: 1 }); }}>
      <label className="race-search">Athlete or bib<input name="q" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a finisher…" maxLength={100} /></label>
      <label>Event edition<select value={edition} onChange={e => { const val = e.target.value; setEdition(val); executeNavigation({ edition: val, page: 1 }); }}><option value="">All events</option>{edition && !editions.some(e => String(e.edition_id) === edition) && <option value={edition}>Selected event edition</option>}{editions.map(e => <option key={e.edition_id} value={e.edition_id}>{e.event_name} · {e.edition_year}</option>)}</select></label>
      <label>Category<select value={sex} onChange={e => { const val = e.target.value; setSex(val); executeNavigation({ sex: val, page: 1 }); }}>{RACE_CATEGORY_FILTERS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
      <label>Percentile<select value={percentile} onChange={e => { const val = e.target.value; setPercentile(val); executeNavigation({ percentile: val, page: 1 }); }}>{RACE_PERCENTILE_FILTERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
      <label>Timeframe<select value={timeframe} onChange={e => { const val = e.target.value; setTimeframe(val); if (val === "all" || val === "12m") executeNavigation({ timeframe: val, page: 1 }); }}>{RACE_TIMEFRAMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
      {timeframe === "year" && <label>Year<input aria-label="Edition year" type="number" min="1900" max="2100" value={year} onChange={e => setYear(e.target.value)} placeholder="2025" required /></label>}
      {timeframe === "custom" && <><label>From<input type="date" min="1900-01-01" max="2100-12-31" value={from} onChange={e => setFrom(e.target.value)} required /></label><label>Through<input type="date" min={from || "1900-01-01"} max="2100-12-31" value={through} onChange={e => setThrough(e.target.value)} required /></label></>}
      <button type="submit" disabled={pending}>{pending ? "Finding…" : "Find results"}</button>
    </form>
    {query.editionId && <p className="race-edition-context">{selectedEdition ? `${selectedEdition.event_name} · ${selectedEdition.edition_year}` : "Selected event edition"}<span>Ranks apply to this edition, category and timeframe. <Link href={`/pace/history?edition=${query.editionId}&distance=${distance}&sex=${query.sex}`}>Compare years →</Link> · <Link href={`/pace/replay?edition=${query.editionId}&distance=${distance}&sex=${query.sex}`}>Replay options →</Link></span></p>}
    {!data ? <div className="race-empty" role="alert"><AppHeading level={2} role="heading">{query.editionError ? "Check the event edition" : query.dateError ? "Check the timeframe" : "Results are unavailable"}</AppHeading><p>{query.editionError ?? query.dateError ?? "Please try again in a moment."}</p><button onClick={() => startTransition(() => router.refresh())}>Retry</button></div> : <>
      <div className="race-summary" aria-live="polite"><div><strong>{data.total.toLocaleString()}</strong><span>{query.query ? "matching results" : "published results"}</span></div><p>{query.timeframe === "year" ? query.year : RACE_TIMEFRAMES.find(t => t.value === query.timeframe)?.label} · {RACE_CATEGORY_FILTERS.find(c => c.value === query.sex)?.label}{query.percentile && query.percentile !== "all" ? ` · ${RACE_PERCENTILE_FILTERS.find(p => p.value === query.percentile)?.label}` : ""}<br/>Chip time where available, otherwise official time</p></div>
      {data.windowFrom && data.windowUntil && <p className="rankings-note">{raceWindowCaption(data)} · Undated results excluded.</p>}
      {data.analytics && <EditionAnalytics analytics={data.analytics} scope={query.editionId ? "edition" : "distance"} />}
      {data.rows.length === 0 ? <div className="race-empty"><AppHeading level={2} role="heading">{query.query ? "No matching finishers" : "No results in this field"}</AppHeading><p>Try another name, category or year.</p></div> : <>
        <div className="race-table" role="region" aria-label="Race results" tabIndex={0}>
          <table><caption className="sr-only">Rank within {data.cohortTotal.toLocaleString()} published results in the selected category and timeframe</caption><thead><tr><th scope="col">Rank</th><th scope="col">Athlete</th><th scope="col">Finish</th><th scope="col">Percentile</th><th scope="col" className="race-event-column">Event</th></tr></thead><tbody>
            {data.rows.map(row => <tr key={row.id}><td className="race-place">{row.place.toLocaleString()}</td><td><Link className="race-result-link" href={`/pace/result/${row.id}`}>{row.athlete_name}</Link><span className="race-mobile-event">{row.event_name}</span>{row.bib && <small>#{row.bib}</small>}</td><td className="race-time">{raceClock(row.rank_time_ms)}<small>{row.rank_clock === "chip" ? "Chip" : "Official"}</small></td><td className="race-percentile-cell">{row.percentile != null ? <span className="race-percentile-pill" title={`Faster than ${row.percentile}% of finishers`}>{row.percentile >= 99 ? "Top 1%" : row.percentile >= 95 ? "Top 5%" : row.percentile >= 90 ? "Top 10%" : row.percentile >= 75 ? "Top 25%" : row.percentile >= 50 ? "Top 50%" : `${row.percentile.toFixed(0)}%`}</span> : "—"}</td><td className="race-event-column">{row.event_name}<small>{row.edition_year}</small></td></tr>)}
          </tbody></table>
        </div>
        <nav className="race-pagination" aria-label="Results pages"><button disabled={pending || data.page <= 1} onClick={() => executeNavigation({ page: data.page - 1 })}>← Previous</button><span>{((data.page - 1) * data.pageSize + 1).toLocaleString()}–{Math.min(data.page * data.pageSize, data.total).toLocaleString()} of {data.total.toLocaleString()}</span><button disabled={pending || data.page * data.pageSize >= data.total} onClick={() => executeNavigation({ page: data.page + 1 })}>Next →</button></nav>
        <form className="race-jump" onSubmit={e => { e.preventDefault(); const value = new FormData(e.currentTarget).get("page"); executeNavigation({ page: Number(value) }); }}><label>Go to page <input type="number" name="page" min="1" max={Math.ceil(data.total / data.pageSize)} required defaultValue={data.page} /></label><button disabled={pending}>Go</button></form>
        <p className="rankings-source">{[...new Set(data.rows.map(r => r.attribution))].join(" · ")}</p>
      </>}
    </>}
  </div>;
}
