import { ObservatoryReplayShell } from "../src/features/observatory-replay-shell";

const BENCHMARK_TO_RACE_SLUG: Record<string, string> = {
  "5k": "5k",
  "10k": "10k",
  half: "half-marathon",
  "half-marathon": "half-marathon",
  marathon: "marathon",
};

export function AllTimeStandingsScreen({
  initialDistance = "marathon",
  initialEdition = "",
  initialSex = "all",
  initialQuery = "",
}: {
  initialDistance?: string;
  initialEdition?: string;
  initialSex?: string;
  initialPercentile?: string;
  initialTimeframe?: string;
  initialYear?: string;
  initialFrom?: string;
  initialThrough?: string;
  initialQuery?: string;
} = {}) {
  return (
    <ObservatoryReplayShell
      initialTab="observatory"
      initialDistance={BENCHMARK_TO_RACE_SLUG[initialDistance] ?? "marathon"}
      initialEdition={initialEdition}
      initialSex={initialSex}
      initialQuery={initialQuery}
    />
  );
}

export default function Benchmarks() {
  return <AllTimeStandingsScreen />;
}
