import { useLocalSearchParams } from "expo-router";
import { RACE_DISTANCES, raceQuery } from "@fitness-battle/shared";
import { ObservatoryReplayShell } from "../src/features/observatory-replay-shell";

export default function RaceReplay() {
  const params = useLocalSearchParams<{
    edition?: string;
    distance?: string;
    sex?: string;
    ids?: string;
  }>();
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string" && v) qs.set(k, v);
  }
  const parsed = raceQuery(qs);
  const distanceSlug = RACE_DISTANCES.find(d => d.slug === params.distance)?.slug ?? "marathon";

  return (
    <ObservatoryReplayShell
      initialTab="replay"
      initialEdition={parsed.editionId ? String(parsed.editionId) : (params.edition ?? "6")}
      initialDistance={distanceSlug}
      initialSex={parsed.sex}
      initialIds={params.ids ?? ""}
    />
  );
}
