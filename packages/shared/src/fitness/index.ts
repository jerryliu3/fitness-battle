import { mockFitnessProvider } from "./mock-provider";
import { createStravaProvider, type StravaEnv } from "./strava-provider";
import type { FitnessProvider } from "./types";
import type { FitnessProviderId } from "../types";

export type { FitnessAuthResult, FitnessProvider, SyncResult } from "./types";
export { mockFitnessProvider } from "./mock-provider";
export {
  createStravaProvider,
  mapSportToCategory,
  mapStravaActivity,
  type StravaEnv,
  type StravaStore,
  type StravaTokenSet,
} from "./strava-provider";
export { createWhoopProvider, mapWhoopRecovery, mapWhoopWorkout } from "./whoop-provider";
export { createOuraProvider, mapOuraReadiness, mapOuraWorkout } from "./oura-provider";
export {
  GARMIN_DEFAULTS,
  createGarminProvider,
  garminAthleteExternalId,
  isGarminCallbackUrl,
  mapGarminActivity,
  type GarminEnv,
} from "./garmin-provider";
export {
  parseActivityFile,
  parseFit,
  parseGpx,
  parseTcx,
  type ParsedActivityFile,
} from "./activity-files";
export { oauth1AuthorizationHeader, oauth1BaseString } from "./oauth1";
export type { OAuth2Env } from "./oauth2";
export {
  BACKFILL_DAYS,
  INCREMENTAL_SYNC_DAYS,
  SYNC_STALE_HOURS,
  syncWindow,
  evidenceFromConnection,
  evidenceLabel,
  type SyncEvidence,
  type SyncWindow,
} from "./sync-window";
export { activityFromSample } from "./samples";
export {
  INTEGRATIONS,
  integrationById,
  type IntegrationSpec,
  type IntegrationKind,
  type IntegrationMaturity,
} from "./providers";

export function getFitnessProvider(
  id: FitnessProviderId,
  env: StravaEnv = {},
): FitnessProvider {
  if (id === "mock") return mockFitnessProvider;
  return createStravaProvider(env);
}

/** Prefer Strava (sibling health apps use on-device HealthKit/Health Connect;
 * Strava is the cloud OAuth tracker default for this product). */
export function defaultFitnessProvider(env: StravaEnv = {}): FitnessProvider {
  return createStravaProvider(env);
}
