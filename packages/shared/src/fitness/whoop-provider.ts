import type { ActivitySample, ReadinessSample } from "../types";
import { mapSportToCategory } from "./strava-provider";
import type { FitnessHttp } from "./http";
import { readJson } from "./http";
import { createOAuth2Provider, type OAuth2Env, type OAuth2Pull } from "./oauth2";

/**
 * WHOOP developer API v2.
 * https://developer.whoop.com/docs/developing/oauth
 * https://developer.whoop.com/api
 */
const WHOOP_API = "https://api.prod.whoop.com/developer/v2";

interface WhoopPage<T> {
  records?: T[];
  next_token?: string;
}

interface WhoopWorkout {
  id?: string | number;
  start?: string;
  end?: string;
  sport_name?: string;
  score_state?: string;
  score?: {
    average_heart_rate?: number;
    distance_meter?: number;
  };
}

interface WhoopRecovery {
  cycle_id?: number;
  created_at?: string;
  score_state?: string;
  score?: { recovery_score?: number };
}

async function paged<T>(
  url: URL,
  accessToken: string,
  http: FitnessHttp,
): Promise<T[]> {
  const collected: T[] = [];
  let next: string | undefined;
  for (let page = 0; page < 8; page += 1) {
    if (next) url.searchParams.set("nextToken", next);
    const response = await http.fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`whoop_pull_failed:${response.status}`);
    const body = (await readJson(response)) as WhoopPage<T>;
    collected.push(...(body.records ?? []));
    next = body.next_token;
    if (!next) return collected;
  }
  throw new Error("whoop_pagination_limit");
}

export function mapWhoopWorkout(raw: WhoopWorkout): ActivitySample | null {
  const sport = mapSportToCategory(raw.sport_name ?? "");
  if (!sport || !raw.id || !raw.start) return null;
  const start = new Date(raw.start);
  const end = raw.end ? new Date(raw.end) : start;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const movingSec = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
  const distance = raw.score?.distance_meter ?? 0;
  const gps = sport !== "strength";
  return {
    id: `whoop-${raw.id}`,
    provider: "whoop",
    externalId: String(raw.id),
    categorySlug: sport,
    startedAt: start.toISOString(),
    metricValue: gps ? distance : movingSec,
    movingSec,
    avgHr: raw.score?.average_heart_rate ?? null,
    rawName: raw.sport_name ?? sport,
  };
}

export function mapWhoopRecovery(raw: WhoopRecovery): ReadinessSample | null {
  const score = raw.score?.recovery_score;
  if (raw.score_state && raw.score_state !== "SCORED") return null;
  if (score == null || !raw.created_at) return null;
  const day = raw.created_at.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const id = raw.cycle_id != null ? String(raw.cycle_id) : day;
  return {
    id: `whoop-recovery-${id}`,
    provider: "whoop",
    externalId: id,
    day,
    score: Math.max(0, Math.min(100, score)),
  };
}

export async function pullWhoop(
  accessToken: string,
  since: string,
  until: string,
  http: FitnessHttp,
): Promise<OAuth2Pull> {
  const workoutsUrl = new URL(`${WHOOP_API}/activity/workout`);
  workoutsUrl.searchParams.set("start", since);
  workoutsUrl.searchParams.set("end", until);
  workoutsUrl.searchParams.set("limit", "25");
  const recoveryUrl = new URL(`${WHOOP_API}/recovery`);
  recoveryUrl.searchParams.set("start", since);
  recoveryUrl.searchParams.set("end", until);
  recoveryUrl.searchParams.set("limit", "25");
  const [workouts, recoveries] = await Promise.all([
    paged<WhoopWorkout>(workoutsUrl, accessToken, http),
    paged<WhoopRecovery>(recoveryUrl, accessToken, http),
  ]);
  return {
    activities: workouts
      .map((item) => mapWhoopWorkout(item))
      .filter((item): item is ActivitySample => item != null),
    readiness: recoveries
      .map((item) => mapWhoopRecovery(item))
      .filter((item): item is ReadinessSample => item != null),
  };
}

export function createWhoopProvider(
  env: OAuth2Env = {},
  options: Parameters<typeof createOAuth2Provider>[2] = {},
) {
  return createOAuth2Provider(
    {
      id: "whoop",
      displayName: "WHOOP",
      authorizeUrl: "https://api.prod.whoop.com/oauth/oauth2/auth",
      tokenUrl: "https://api.prod.whoop.com/oauth/oauth2/token",
      scopes: "offline read:recovery read:workout",
      missingCredentialsMessage:
        "WHOOP credentials missing — using stub readiness. Set WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, and WHOOP_REDIRECT_URI.",
      pull: pullWhoop,
      async revoke(accessToken, http) {
        const response = await http.fetch(`${WHOOP_API}/user/access`, {
          method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok && response.status !== 404) throw new Error(`whoop_revoke_failed:${response.status}`);
      },
    },
    env,
    options,
  );
}
