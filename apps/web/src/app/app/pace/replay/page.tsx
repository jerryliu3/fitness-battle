import { RACE_DISTANCES, raceEventGroups, raceQuery } from "@fitness-battle/shared";
import { loadRaceCoverage, loadReplayCoursePreviews } from "@/lib/race-results";
import { ReplayPlayer } from "./replay-player";

export const dynamic = "force-dynamic";

export default async function ReplayPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
  }
  const query = raceQuery(params);
  const clock = ["chip", "gun"].includes(params.get("clock") ?? "") ? (params.get("clock") as string) : "chip";
  let coverage = null;
  try {
    coverage = await loadRaceCoverage();
  } catch {
    coverage = null;
  }
  const coursePreviews = coverage ? await loadReplayCoursePreviews(coverage).catch(() => ({})) : {};

  const allGroups = coverage ? raceEventGroups(coverage, "all") : [];
  const requestedDistance = RACE_DISTANCES.find(d => d.slug === params.get("distance"));

  let activeEditionId = query.editionId && !query.editionError ? query.editionId : null;
  let activeDistance = requestedDistance ?? RACE_DISTANCES.find(d => d.slug === "marathon") ?? RACE_DISTANCES[0];

  if (!activeEditionId) {
    const chicago = allGroups.find(g => g.edition_id === 6 || g.event_name.toLowerCase().includes("chicago"));
    const chosen = chicago ?? allGroups[0];
    activeEditionId = chosen?.edition_id ?? 6;
    if (!requestedDistance && chosen) {
      activeDistance = RACE_DISTANCES.find(d => d.stored === chosen.distance_slug) ?? activeDistance;
    }
  } else if (!requestedDistance) {
    const matchingGroup = allGroups.find(g => g.edition_id === activeEditionId);
    if (matchingGroup) {
      activeDistance = RACE_DISTANCES.find(d => d.stored === matchingGroup.distance_slug) ?? activeDistance;
    }
  }

  return (
    <main className="rankings-wrap ovt-replay-main">
      <div className="ovt-heading">
        <div>
          <span className="ovt-kicker">REPLAY STUDIO</span>
          <h1>Watch the field unfold.</h1>
        </div>
      </div>
      <ReplayPlayer
        scope={{
          edition: String(activeEditionId),
          distance: activeDistance.slug,
          sex: params.get("sex") === "all" ? "all" : query.sex,
          clock,
        }}
        initialIds={params.get("ids") ?? ""}
        initialCoverage={coverage}
        initialCoursePreviews={coursePreviews}
      />
    </main>
  );
}
