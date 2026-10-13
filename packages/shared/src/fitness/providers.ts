import type { FitnessProviderId } from "../types";

/**
 * Integration catalog for product + settings UI.
 * Only Strava, WHOOP, Oura, and Garmin have runnable server adapters.
 * Apple Health and Health Connect ingest from the phone.
 * Missing credentials stay on an honest stub.
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
    maturity: "stub_ready",
    blurb: "Watch activities via the Health API, or a FIT/GPX/TCX file",
    setupSteps: [
      "Apply to the Garmin Health API program and wait for approval",
      "Set GARMIN_CONSUMER_KEY, GARMIN_CONSUMER_SECRET, and GARMIN_REDIRECT_URI",
      "User authorizes with OAuth 1.0a; the server pulls activity summaries",
      "Until approval, import a Garmin export (.fit, .gpx, .tcx, or .zip)",
    ],
    offlineCapability:
      "Without keys, connect stays on the stub. GPX, TCX, and FIT import records real activities with no API approval.",
  },
  {
    id: "apple_health",
    name: "Apple Health",
    kind: "activity",
    maturity: "device_only",
    blurb: "iPhone workouts pushed from the mobile app",
    setupSteps: [
      "Build the Expo dev client (HealthKit is not available in Expo Go)",
      "The phone requests HealthKit workout read permission",
      "The app posts samples to POST /api/fitness/ingest",
    ],
    offlineCapability: "Web cannot read HealthKit. The ingest route and mobile sync screen are implemented.",
  },
  {
    id: "google_health",
    name: "Health Connect",
    kind: "activity",
    maturity: "device_only",
    blurb: "Android workouts via Health Connect",
    setupSteps: [
      "Build the Expo dev client with the Health Connect plugin",
      "The phone requests exercise read permission",
      "The app posts samples to POST /api/fitness/ingest",
    ],
    offlineCapability: "Web cannot read Health Connect. The ingest route and mobile sync screen are implemented.",
  },
  {
    id: "whoop",
    name: "WHOOP",
    kind: "readiness",
    maturity: "stub_ready",
    blurb: "Recovery score and scored workouts",
    setupSteps: [
      "Pilot: run Open Wearables (`pnpm ow:up`), set OPEN_WEARABLES_API_URL/API_KEY and OPEN_WEARABLES_WHOOP=true",
      "Put WHOOP_CLIENT_ID/SECRET on the Open Wearables instance (callback {OW}/api/v1/oauth/whoop/callback)",
      "Or legacy direct path: set WHOOP_* on the web app and leave OPEN_WEARABLES_WHOOP unset",
      "User authorizes; sync pulls normalized workouts/recovery into Fitness Battle",
    ],
    offlineCapability:
      "Without keys (or OW), connect returns status=stub. With the OW pilot, OAuth runs through Open Wearables.",
  },
  {
    id: "oura",
    name: "Oura",
    kind: "readiness",
    maturity: "stub_ready",
    blurb: "Daily readiness and workouts",
    setupSteps: [
      "Create an Oura Cloud API application",
      "Set OURA_CLIENT_ID, OURA_CLIENT_SECRET, and OURA_REDIRECT_URI",
      "User authorizes; the server pulls daily readiness and workouts",
    ],
    offlineCapability:
      "Without keys, connect returns status=stub. With keys, OAuth and the v2 readiness/workout pull run.",
  },
];

export function integrationById(
  id: IntegrationSpec["id"],
): IntegrationSpec | undefined {
  return INTEGRATIONS.find((item) => item.id === id);
}
