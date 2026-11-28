import { stripWebProductPrefix } from "./product-routes";
import { shellTabFromPath, type ShellTabId } from "./shell";

/**
 * Platform-agnostic telemetry contract shared by web and mobile.
 * Plain TypeScript only — no React, DOM, Next, or Expo imports.
 */

export type TelemetryEnvironment = "development" | "preview" | "production";

export type TelemetryTrackerProvider =
  | "strava"
  | "garmin"
  | "whoop"
  | "oura"
  | "apple_health"
  | "health_connect";

export interface TelemetryEventMap {
  screen_viewed: {
    screen: string;
    tab?: ShellTabId | null;
    previous_screen?: string | null;
    duration_ms?: number;
  };
  cta_clicked: {
    id: string;
    screen: string;
    label?: string;
  };
  onboarding_step_completed: {
    step: string;
    step_index?: number;
  };
  battle_joined: {
    battle_id?: string;
    source?: string;
  };
  tracker_connect_started: {
    provider: TelemetryTrackerProvider;
    surface: string;
  };
  tracker_connect_completed: {
    provider: TelemetryTrackerProvider;
    surface: string;
  };
  tracker_sync_failed: {
    provider: TelemetryTrackerProvider;
    reason?: string;
    status?: number;
  };
  workout_logged: {
    sport?: string;
    source?: string;
  };
}

export type TelemetryEventName = keyof TelemetryEventMap;

export interface NormalizedTelemetryScreen {
  screen: string;
  tab: ShellTabId | null;
}

/**
 * Normalizes a Next.js or Expo Router pathname into a canonical product screen
 * (stripping `/app` prefix, query strings, hashes, and trailing slashes).
 */
export function normalizeTelemetryScreen(
  pathname: string | null | undefined,
): NormalizedTelemetryScreen {
  if (!pathname) return { screen: "/", tab: null };
  const withoutQuery = pathname.split("?")[0]?.split("#")[0] ?? "/";
  const stripped = stripWebProductPrefix(withoutQuery);
  const normalized =
    stripped.length > 1 && stripped.endsWith("/")
      ? stripped.slice(0, -1)
      : stripped || "/";
  const tab = shellTabFromPath(normalized);
  return {
    screen: normalized,
    tab: tab?.id ?? null,
  };
}

const IGNORED_ERROR_PATTERNS = [
  /aborterror/i,
  /the operation was aborted/i,
  /cancelled/i,
  /resizeobserver loop/i,
  /network request failed/i,
  /failed to fetch/i,
  /load failed/i,
  /non-error promise rejection/i,
];

/**
 * Filters expected transient/offline/browser-noise errors so free-tier
 * crash quotas are reserved for actionable bugs.
 */
export function shouldDropTelemetryErrorMessage(
  message: string | null | undefined,
): boolean {
  if (!message) return false;
  return IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function resolveTelemetryEnvironment(options: {
  isDev: boolean;
  explicitEnv?: string | null;
  useDemoData?: boolean;
}): {
  environment: TelemetryEnvironment;
  enabled: boolean;
} {
  const raw = options.explicitEnv?.trim().toLowerCase();
  const environment: TelemetryEnvironment =
    raw === "production" || raw === "preview" || raw === "development"
      ? raw
      : options.isDev
        ? "development"
        : "production";

  // Keep local dev and demo-data sessions out of production telemetry quotas.
  const enabled = environment !== "development" && !options.useDemoData;
  return { environment, enabled };
}

const BLOCKED_PROPERTY_KEYS = new Set([
  "email",
  "password",
  "token",
  "access_token",
  "refresh_token",
  "secret",
  "heart_rate",
  "hrv",
  "weight",
  "calories",
  "distance_meters",
  "gps",
  "polyline",
  "lat",
  "lng",
]);

/**
 * Removes PII, auth secrets, and raw biometric/HealthKit fields from event
 * properties before sending to third-party telemetry providers.
 */
export function sanitizeTelemetryProperties<
  T extends Record<string, unknown>,
>(props: T): Partial<T> {
  const clean: Partial<T> = {};
  for (const [key, value] of Object.entries(props)) {
    if (BLOCKED_PROPERTY_KEYS.has(key.toLowerCase())) continue;
    if (value !== undefined) {
      clean[key as keyof T] = value as T[keyof T];
    }
  }
  return clean;
}
