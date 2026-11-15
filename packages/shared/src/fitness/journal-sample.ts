import type { ActivitySample, FitnessProviderId } from "../types";

/** Unknown tracker workouts land in strength bucket but never compete (journal-only). */
export function journalSampleFromUnmapped(input: {
  id: string;
  provider: FitnessProviderId;
  externalId: string;
  startedAt: string;
  movingSec: number;
  rawName: string;
  distanceM?: number;
  avgHr?: number | null;
  verified?: boolean;
  summaryPolyline?: string | null;
  detailedPolyline?: string | null;
  elevationGainM?: number | null;
}): ActivitySample {
  const movingSec = Math.max(0, input.movingSec);
  return {
    id: input.id,
    provider: input.provider,
    externalId: input.externalId,
    categorySlug: "strength",
    startedAt: input.startedAt,
    metricValue: movingSec,
    movingSec,
    avgHr: input.avgHr ?? null,
    rawName: input.rawName,
    verified: false,
    journalOnly: true,
    summaryPolyline: input.summaryPolyline ?? null,
    detailedPolyline: input.detailedPolyline ?? null,
    elevationGainM: input.elevationGainM ?? null,
  };
}