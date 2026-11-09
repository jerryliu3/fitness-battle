import Link from "next/link";
import { AppHeading } from "@/ui/section";
import { notFound } from "next/navigation";
import { RACE_DISTANCES, raceQuery } from "@fitness-battle/shared";
import { loadRaceResults } from "@/lib/race-results";
import { RaceExplorer } from "../race-explorer";

export const dynamic = "force-dynamic";
export default async function DistanceBoardPage({ params, searchParams }: {
  params: Promise<{ distance: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { distance } = await params;
  const selected = RACE_DISTANCES.find(d => d.slug === distance);
  if (!selected) notFound();
  const raw = await searchParams;
  const query = raceQuery({ get: name => typeof raw[name] === "string" ? raw[name] as string : null });
  let data = null;
  try { data = await loadRaceResults(selected.stored, query); } catch { /* Render recoverable unavailable state. */ }
  return <main className="rankings-wrap">
    <header className="rankings-top"><Link href="/rankings">← Race rankings</Link><span className="rankings-kicker">Road running</span></header>
    <AppHeading level={1} role="display">{selected.label}</AppHeading>
    <RaceExplorer key={`${distance}:${JSON.stringify(query)}`} distance={distance} initial={data} query={query} />
  </main>;
}
