import Link from "next/link";
import { RACE_CATEGORY_FILTERS, RACE_DISTANCES, raceClock, raceQuery } from "@fitness-battle/shared";
import { loadRaceResults } from "@/lib/race-results";
import { AppHeading } from "@/ui/section";

export const dynamic = "force-dynamic";

const metrics = [
  ["Top 1% cutoff", "top1Ms"],
  ["Top 5% cutoff", "top5Ms"],
  ["Top 10% cutoff", "top10Ms"],
  ["Top 25% cutoff", "top25Ms"],
  ["Median finish", "medianMs"],
] as const;

export default async function PaceTrends({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const distance = RACE_DISTANCES.find(option => option.slug === raw.distance) ?? RACE_DISTANCES[3];
  const sex = raceQuery(new URLSearchParams({ sex: typeof raw.sex === "string" ? raw.sex : "all" })).sex;
  const years = [raw.first, raw.second].map(value => typeof value === "string" && /^\d{4}$/.test(value) ? Number(value) : 0);
  const valid = years.every(year => year >= 1900 && year <= 2100) && years[0] !== years[1];
  const fields = valid ? await Promise.allSettled(years.map(year =>
    loadRaceResults(distance.stored, raceQuery(new URLSearchParams({ sex, year: String(year) }))),
  )) : null;

  return <main className="rankings-wrap race-explorer">
    <Link href="/app/pace">← Times</Link>
    <AppHeading level={1} role="display">Percentiles over time</AppHeading>
    <p className="rankings-note">Compare published finishes for the same distance and category across two edition years. Changes in which events are covered can shift the cutoffs.</p>
    <form className="race-filters" method="get">
      <label>Distance<select name="distance" defaultValue={distance.slug}>{RACE_DISTANCES.map(option =>
        <option key={option.slug} value={option.slug}>{option.label}</option>
      )}</select></label>
      <label>Category<select name="sex" defaultValue={sex}>{RACE_CATEGORY_FILTERS.map(category =>
        <option key={category.value} value={category.value}>{category.label}</option>
      )}</select></label>
      <label>First year<input name="first" type="number" min={1900} max={2100} defaultValue={years[0] || ""} required /></label>
      <label>Second year<input name="second" type="number" min={1900} max={2100} defaultValue={years[1] || ""} required /></label>
      <button>Compare years</button>
    </form>
    {!valid && (raw.first != null || raw.second != null) && <p role="alert">Enter two different edition years from 1900 to 2100.</p>}
    {fields && <div className="race-table" role="region" aria-label="Yearly percentile comparison" tabIndex={0}>
      <table>
        <thead><tr><th scope="col">Published field</th>{years.map(year => <th key={year} scope="col">
          <Link href={`/app/pace?${new URLSearchParams({ distance: distance.slug, sex, year: String(year) })}`}>{year} leaderboard</Link>
        </th>)}</tr></thead>
        <tbody>
          <tr><th scope="row">Finishes</th>{fields.map((field, index) => <td key={years[index]}>{field.status === "fulfilled" ? field.value.cohortTotal.toLocaleString() : "Unavailable"}</td>)}</tr>
          <tr><th scope="row">Race editions</th>{fields.map((field, index) => <td key={years[index]}>{field.status === "fulfilled" ? (field.value.analytics?.editionCount ?? (field.value.cohortTotal === 0 ? 0 : "—")) : "—"}</td>)}</tr>
          {metrics.map(([label, key]) => <tr key={key}><th scope="row">{label}</th>{fields.map((field, index) => {
            const analytics = field.status === "fulfilled" ? field.value.analytics : null;
            const time = key === "medianMs" ? analytics?.medianMs : analytics?.benchmarks?.[key];
            return <td key={years[index]}>{time == null ? "—" : raceClock(time)}</td>;
          })}</tr>)}
        </tbody>
      </table>
    </div>}
  </main>;
}
