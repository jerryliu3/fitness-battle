import { mockFitnessProvider } from "./mock-provider";
import { createStravaProvider, type StravaEnv } from "./strava-provider";
import type { FitnessProvider } from "./types";
import type { FitnessProviderId } from "../types";

export type { FitnessAuthResult, FitnessProvider, SyncResult } from "./types";
export { mockFitnessProvider } from "./mock-provider";
export { createStravaProvider } from "./strava-provider";

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
