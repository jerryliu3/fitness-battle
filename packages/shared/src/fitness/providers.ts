import type { FitnessProviderId } from "../types";

/**
 * Integration catalog for product + settings UI.
 * Only Strava and mock have runnable adapters today; others are scoped
 * so the UI can show honest "coming soon" vs stub vs live states.
 */
export type IntegrationKind = "activity" | "readiness";
export type IntegrationMaturity =
  | "live_ready"
  | "stub_ready"
  | "planned"
  | "device_only";

export interface IntegrationSpec {
  id: FitnessProviderId | "garmin" | "apple_health" | "google_health" | "whoop" | "oura";
  name: string;
  kind: IntegrationKind;
  maturity: IntegrationMaturity;
  blurb: string;
  /** High-level steps required before live data (no secrets in this doc). */
  setupSteps: string[];
  /** What the server can do without real API keys. */
  offlineCapability: string;
}

export const INTEGRATIONS: IntegrationSpec[] = [
  {
    id: "strava",
    name: "Strava",
    kind: "activity",
    maturity: "stub_ready",
    blurb: "Runs, rides, and walks via OAuth",
    setupSteps: [
      "Create a Strava API application",
      "Set STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI on the web server",
      "User opens connect → authorize → callback exchanges code for tokens",
      "Server stores tokens privately and pulls athlete activities",
      "First connect runs a one-time 90-day backfill; later syncs are incremental",
    ],
    offlineCapability:
      "Without keys, connect returns status=stub and sync returns labeled mock activities.",
  },
  {
    id: "mock",
    name: "Mock tracker",
    kind: "activity",
    maturity: "live_ready",
    blurb: "Deterministic sample workouts for local/dev",
    setupSteps: ["No keys. Used automatically when Strava credentials are missing."],
    offlineCapability: "Always available; never claim this is a real athlete connection.",
  },
  {
    id: "garmin",
    name: "Garmin",
    kind: "activity",
    maturity: "planned",
    blurb: "Watch activities via Garmin Connect API",
    setupSteps: [
      "Register a Garmin Connect developer app",
      "OAuth 1.0a / Connect IQ credential exchange on server routes",
      "Activity pull + activity webhook optional",
    ],
    offlineCapability: "Compete UI can simulate a link for demos; no server sync yet.",
  },
  {
    id: "apple_health",
    name: "Apple Health",
    kind: "activity",
    maturity: "device_only",
    blurb: "iPhone workouts pushed from the mobile app",
    setupSteps: [
      "Mobile requests HealthKit workout read permission",
      "Device batches samples to POST /api/fitness/ingest",
      "Server upserts by provider_native_id",
    ],
    offlineCapability: "Requires the Expo app; web cannot read HealthKit.",
  },
  {
    id: "google_health",
    name: "Health Connect",
    kind: "activity",
    maturity: "device_only",
    blurb: "Android workouts via Health Connect",
    setupSteps: [
      "Mobile requests Health Connect permissions",
      "Device batches samples to POST /api/fitness/ingest",
    ],
    offlineCapability: "Requires the Expo app; web cannot read Health Connect.",
  },
  {
    id: "whoop",
    name: "WHOOP",
    kind: "readiness",
    maturity: "planned",
    blurb: "Recovery and strain marks",
    setupSteps: [
      "WHOOP developer OAuth app",
      "Pull recovery / sleep daily; map to readiness score 0–100",
    ],
    offlineCapability: "Compete UI can add a synthetic readiness mark after a demo link.",
  },
  {
    id: "oura",
    name: "Oura",
    kind: "readiness",
    maturity: "planned",
    blurb: "Sleep and readiness marks",
    setupSteps: [
      "Oura Cloud API OAuth app",
      "Pull daily readiness; map to score 0–100",
    ],
    offlineCapability: "Compete UI can add a synthetic readiness mark after a demo link.",
  },
];

export function integrationById(
  id: IntegrationSpec["id"],
): IntegrationSpec | undefined {
  return INTEGRATIONS.find((item) => item.id === id);
}
