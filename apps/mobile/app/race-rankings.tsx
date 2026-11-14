import { useLocalSearchParams } from "expo-router";
import { RACE_DISTANCES, raceQuery } from "@fitness-battle/shared";
import { AllTimeStandingsScreen } from "./benchmarks";

const DISTANCE_TO_BENCHMARK: Record<string, string> = {
  "5k": "5k",
  "10k": "10k",
  "half-marathon": "half",
  marathon: "marathon",
};

export default function RaceRankings() {
  const params = useLocalSearchParams<{
    edition?: string;
    distance?: string;
    sex?: string;
    percentile?: string;
    timeframe?: string;
    year?: string;
    from?: string;
    through?: string;
    q?: string;
  }>();
  const searchParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (typeof val === "string" && val) searchParams.set(key, val);
  }
  const initial = raceQuery(searchParams);
  const raceSlug = RACE_DISTANCES.find((d) => d.slug === params.distance)?.slug ?? "marathon";

  return (
    <AllTimeStandingsScreen
      initialSource="published"
      initialSport="running"
      initialDistance={DISTANCE_TO_BENCHMARK[raceSlug] ?? "marathon"}
      initialEdition={initial.editionId ? String(initial.editionId) : (params.edition ?? "")}
      initialSex={initial.sex}
      initialPercentile={initial.percentile ?? "all"}
      initialTimeframe={initial.timeframe}
      initialYear={initial.year ? String(initial.year) : ""}
      initialFrom={initial.from}
      initialThrough={initial.through}
      initialQuery={initial.query}
    />
  );
}
