import type { ActivitySample, ReadinessSample } from "../types";
import type { FitnessHttp } from "./http";
import { readJson } from "./http";
import { createOAuth2Provider, type OAuth2Env, type OAuth2Pull } from "./oauth2";
import { mapSportToCategory } from "./strava-provider";

/**
 * Oura Cloud API v2.
 * https://cloud.ouraring.com/docs/authentication
 * https://cloud.ouraring.com/v2/docs
 */
const OURA_API = "https://api.ouraring.com/v2/usercollection";

interface OuraList<T> {
  data?: T[];
  next_token?: string;
}

interface OuraWorkout {
  id?: string;
  activity?: string;
  start_datetime?: string;
  end_datetime?: string;
  distance?: number;
  label?: string;
}

interface OuraReadiness {
  id?: string;
  day?: string;
  score?: number;
}

async function ouraGet<T>(
  path: string,
  accessToken: string,
  sinceDay: string,
  untilDay: string,
  http: FitnessHttp,
): Promise<T[]> {
  const collected: T[] = [];
  let next: string | undefined;
  for (let page = 0; page < 8; page += 1) {
    const url = new URL(`${OURA_API}/${path}`);
    url.searchParams.set("start_date", sinceDay);
    url.searchParams.set("end_date", untilDay);
    if (next) url.searchParams.set("next_token", next);
    const response = await http.fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`oura_pull_failed:${response.status}`);
    const body = (await readJson(response)) as OuraList<T>;
    collected.push(...(body.data ?? []));
    next = body.next_token;
    if (!next) break;
  }
  return collected;
}

export function mapOuraWorkout(raw: OuraWorkout): ActivitySample | null {
  const sport = mapSportToCategory(raw.activity ?? "");
  if (!sport || !raw.id || !raw.start_datetime) return null;
  const start = new Date(raw.start_datetime);
  const end = raw.end_datetime ? new Date(raw.end_datetime) : start;
  if (Number.isNaN(start.getTime())) return null;
  const movingSec = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
  const distance = raw.distance ?? 0;
  const gps = sport !== "strength";
  return {
    id: `oura-${raw.id}`,
    provider: "oura",
    externalId: raw.id,
    categorySlug: sport,
    startedAt: start.toISOString(),
    metricValue: gps ? distance : movingSec,
    movingSec,
    avgHr: null,
    rawName: raw.label || raw.activity || sport,
  };
}

export function mapOuraReadiness(raw: OuraReadiness): ReadinessSample | null {
  if (!raw.day || raw.score == null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.day)) return null;
  const externalId = raw.id || raw.day;
  return {
    id: `oura-readiness-${externalId}`,
    provider: "oura",
    externalId,
    day: raw.day,
    score: Math.max(0, Math.min(100, raw.score)),
  };
}

export async function pullOura(
  accessToken: string,
  since: string,
  until: string,
  http: FitnessHttp,
): Promise<OAuth2Pull> {
  const sinceDay = since.slice(0, 10);
  const untilDay = until.slice(0, 10);
  const [workouts, readiness] = await Promise.all([
    ouraGet<OuraWorkout>("workout", accessToken, sinceDay, untilDay, http),
    ouraGet<OuraReadiness>("daily_readiness", accessToken, sinceDay, untilDay, http),
  ]);
  return {
    activities: workouts
      .map((item) => mapOuraWorkout(item))
      .filter((item): item is ActivitySample => item != null),
    readiness: readiness
      .map((item) => mapOuraReadiness(item))
      .filter((item): item is ReadinessSample => item != null),
  };
}

export function createOuraProvider(
  env: OAuth2Env = {},
  options: Parameters<typeof createOAuth2Provider>[2] = {},
) {
  return createOAuth2Provider(
    {
      id: "oura",
      displayName: "Oura",
      authorizeUrl: "https://cloud.ouraring.com/oauth/authorize",
      tokenUrl: "https://api.ouraring.com/oauth/token",
      scopes: "daily workout heartrate personal",
      missingCredentialsMessage:
        "Oura credentials missing — using stub readiness. Set OURA_CLIENT_ID, OURA_CLIENT_SECRET, and OURA_REDIRECT_URI.",
      pull: pullOura,
    },
    env,
    options,
  );
}
