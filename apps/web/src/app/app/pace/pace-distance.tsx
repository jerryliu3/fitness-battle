import { notFound } from "next/navigation";
import { RACE_DISTANCES, raceQuery } from "@fitness-battle/shared";
import { loadRaceResults, loadRaceCoverage, loadReplayCoursePreviews } from "@/lib/race-results";
import { RaceExplorer } from "./race-explorer";

export const dynamic = "force-dynamic";

export default async function PaceDistance({ params, searchParams }: {
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
  const coursePreviews = coverage ? await loadReplayCoursePreviews(coverage).catch(() => ({})) : {};

  return (
    <main className="rankings-wrap ovt-observatory-main">
      <div className="ovt-heading">
        <div>
          <span className="ovt-kicker">OBSERVATORY</span>
          <h1>Every finish. One perspective.</h1>
        </div>
      </div>
      <RaceExplorer
        distance={distance}
        initial={data}
        query={query}
        coverage={coverage}
        initialCoursePreviews={coursePreviews}
      />
    </main>
  );
}
