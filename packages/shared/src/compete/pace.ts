import { athleteBenchmarkSeconds, fieldAthletes, sameRank } from "./field";
import { rollClock } from "./engine";
import type { CompeteState, SportId } from "./sports";

export interface Benchmark {
  id: string;
  label: string;
  meters: number;
}

export const BENCHMARKS: Record<"running" | "cycling", Benchmark[]> = {
  running: [
    { id: "5k", label: "5K", meters: 5000 },
    { id: "10k", label: "10K", meters: 10000 },
    { id: "half", label: "Half marathon", meters: 21097 },
    { id: "marathon", label: "Marathon", meters: 42195 },
  ],
  cycling: [
    { id: "20k", label: "20K", meters: 20000 },
    { id: "40k", label: "40K", meters: 40000 },
  ],
};

export type PaceScope = "global" | "local" | "category";

export interface PaceRow {
  id: string;
  name: string;
  city: string;
  seconds: number;
  you: boolean;
  place: number;
}

/** Fastest time at or beyond the distance, scaled back to the benchmark. */
export function yourBenchmarkSeconds(
  state: CompeteState,
  sport: SportId,
  meters: number,
): number | null {
  let best: number | null = null;
  for (const activity of state.activities) {
    if (activity.sport !== sport || activity.distanceM < meters) continue;
    if (activity.movingSec <= 0) continue;
    const seconds = activity.movingSec * (meters / activity.distanceM);
    if (best == null || seconds < best) best = seconds;
  }
  return best;
}

export function paceBoard(
  state: CompeteState,
  sport: "running" | "cycling",
  benchmark: Benchmark,
  scope: PaceScope,
  now: Date = new Date(),
): PaceRow[] {
  const live = rollClock(state, now);
  const mine = live.ratings.find((item) => item.sport === sport);
  const yourElo = mine?.openElo ?? 1000;
  const rows: Omit<PaceRow, "place">[] = [];
  for (const athlete of fieldAthletes(sport)) {
    if (scope === "local" && athlete.city !== live.city) continue;
    if (scope === "category" && !sameRank(yourElo, athlete.elo)) continue;
    rows.push({
      id: athlete.id,
      name: athlete.name,
      city: athlete.city,
      seconds: athleteBenchmarkSeconds(athlete.elo, benchmark.meters),
      you: false,
    });
  }
  const yours = yourBenchmarkSeconds(live, sport, benchmark.meters);
  if (yours != null) {
    rows.push({
      id: "you",
      name: live.name,
      city: live.city,
      seconds: yours,
      you: true,
    });
  }
  rows.sort((a, b) => a.seconds - b.seconds || a.name.localeCompare(b.name));
  return rows.map((row, index) => ({ ...row, place: index + 1 }));
}

export function formatClockTime(seconds: number): string {
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}
