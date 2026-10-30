import { NextResponse } from "next/server";
import {
  evidenceFromConnection,
  evidenceLabel,
  INTEGRATIONS,
  type FitnessConnection,
  type FitnessProviderId,
} from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { getServerFitnessProvider, isOAuthProvider } from "@/lib/fitness";
import { createProviderStore } from "@/lib/fitness-store";

const TRACKED: FitnessProviderId[] = [
  "strava",
  "garmin",
  "apple_health",
  "google_health",
  "whoop",
  "oura",
];

async function connectionFor(
  userId: string,
  provider: FitnessProviderId,
): Promise<FitnessConnection> {
  if (isOAuthProvider(provider)) {
    const connection = await getServerFitnessProvider(provider).getConnection(userId);
    const tokens = await createProviderStore(provider)?.getTokens(userId);
    if (connection.status === "connected" && !tokens) return { ...connection, status: "disconnected", connectedAt: null };
    return connection;
  }
  const store = createProviderStore(provider);
  const existing = store ? await store.getConnection(userId) : null;
  return (
    existing ?? {
      userId,
      provider,
      connectedAt: null,
      status: "disconnected",
    }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = await resolveRequestUserId(request, url.searchParams.get("userId"));
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const connections = await Promise.all(
    TRACKED.map((provider) => connectionFor(userId, provider)),
  );
  const strava = connections.find((item) => item.provider === "strava") ?? connections[0]!;
  const evidence = evidenceFromConnection({
    status: strava.status,
    lastSyncAt: strava.lastSyncAt,
    lastActivityAt: strava.lastActivityAt,
  });
  return NextResponse.json({
    connection: strava,
    connections: connections.map((connection) => ({
      ...connection,
      evidence: evidenceFromConnection({
        status: connection.status,
        lastSyncAt: connection.lastSyncAt,
        lastActivityAt: connection.lastActivityAt,
      }),
      evidenceLabel: evidenceLabel(
        evidenceFromConnection({
          status: connection.status,
          lastSyncAt: connection.lastSyncAt,
          lastActivityAt: connection.lastActivityAt,
        }),
      ),
    })),
    evidence,
    evidenceLabel: evidenceLabel(evidence),
    integrations: INTEGRATIONS.map((item) => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      maturity: item.maturity,
      blurb: item.blurb,
      offlineCapability: item.offlineCapability,
      setupSteps: item.setupSteps,
    })),
  });
}
