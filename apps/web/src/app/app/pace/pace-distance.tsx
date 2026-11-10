import Link from "next/link";
import { AppHeading } from "@/ui/section";
import { notFound } from "next/navigation";
import { RACE_DISTANCES, raceQuery } from "@fitness-battle/shared";
import { loadRaceResults, loadRaceCoverage } from "@/lib/race-results";
import { RaceExplorer } from "./race-explorer";

export const dynamic = "force-dynamic";
export default async function PaceDistance({ params, searchParams, home = false }: {
  home?: boolean;
  params: Promise<{ distance: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { distance } = await params;
  const selected = RACE_DISTANCES.find(d => d.slug === distance);
  if (!selected) notFound();
  const raw = await searchParams;
  const query = raceQuery({ get: name => typeof raw[name] === "string" ? raw[name] as string : null });
  const [results, inventory] = await Promise.allSettled([
    query.dateError || query.editionError ? Promise.resolve(null) : loadRaceResults(selected.stored, query),
    loadRaceCoverage(),
  ]);
  const data = results.status === "fulfilled" ? results.value : null;
  const coverage = inventory.status === "fulfilled" ? inventory.value : null;
  return <main className="rankings-wrap">
    <header className="rankings-top">{!home && <Link href="/pace">← Times</Link>}<span className="rankings-kicker">Public race results</span></header>
    <AppHeading level={1} role="display">{home ? "Times" : selected.label}</AppHeading>
    {home && <p className="rankings-lede">Explore published race finishes, complete fields and recorded performance analytics.</p>}
    <RaceExplorer key={`${distance}:${JSON.stringify(query)}`} distance={distance} initial={data} query={query} coverage={coverage} />
  </main>;
}
