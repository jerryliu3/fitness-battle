import {
  activityFromSample,
  type ActivitySample,
  type ProviderId,
  type ReadinessMark,
  type ReadinessSample,
} from "@fitness-battle/shared";
import * as Linking from "expo-linking";
import { apiFetch } from "./api";

const OAUTH_PROVIDERS = new Set<ProviderId>(["strava", "garmin", "whoop", "oura"]);
const DEVICE_PROVIDERS = new Set<ProviderId>(["apple_health", "google_health"]);

export { OAUTH_PROVIDERS, DEVICE_PROVIDERS };

export type RemoteSyncBody = {
  provider: ProviderId;
  usedMock?: boolean;
  activities?: ActivitySample[];
  readiness?: ReadinessSample[];
  windowKind?: string;
  source?: string;
};

export function parseRemoteSync(body: RemoteSyncBody) {
  const activities = (body.activities ?? [])
    .map((sample) => activityFromSample(sample))
    .filter((activity) => activity != null);
  const readiness: ReadinessMark[] = (body.readiness ?? []).flatMap((sample) => {
    if (
      !OAUTH_PROVIDERS.has(sample.provider as ProviderId) &&
      !DEVICE_PROVIDERS.has(sample.provider as ProviderId)
    ) {
      return [];
    }
    if (sample.provider === "mock") return [];
    return [
      {
        id: sample.id,
        provider: sample.provider as ProviderId,
        day: sample.day,
        score: sample.score,
      },
    ];
  });
  return {
    activities,
    readiness,
    linkStatus: (body.usedMock ? "stub" : "connected") as "stub" | "connected",
  };
}

export async function connectProvider(
  providerId: ProviderId,
  userId?: string,
): Promise<{ authorizeUrl?: string; message?: string; error?: string }> {
  const response = await apiFetch("/api/fitness/connect", {
    method: "POST",
    body: JSON.stringify({ userId, provider: providerId }),
  });
  const body = (await response.json()) as {
    authorizeUrl?: string;
    message?: string;
    error?: string;
  };
  if (!response.ok) return { error: body.error ?? "Could not start connect." };
  return body;
}

export async function syncProviderApi(
  providerId: ProviderId,
  userId?: string,
): Promise<RemoteSyncBody & { error?: string }> {
  const response = await apiFetch("/api/fitness/sync", {
    method: "POST",
    body: JSON.stringify({ userId, provider: providerId }),
  });
  const body = (await response.json()) as RemoteSyncBody & { error?: string };
  if (!response.ok) return { provider: providerId, error: body.error ?? "Sync failed" };
  return { ...body, provider: providerId };
}

export async function openAuthorizeUrl(authorizeUrl: string) {
  await Linking.openURL(authorizeUrl);
}
