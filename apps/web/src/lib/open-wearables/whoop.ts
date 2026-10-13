import {
  mapOwHealthScoreToReadiness,
  mapOwWorkoutToActivity,
  type FitnessAuthResult,
  type FitnessConnection,
  type FitnessProvider,
  type OwHealthScore,
  type OwWorkout,
  type SyncResult,
  syncWindow,
} from "@fitness-battle/shared";
import { webEnv } from "@/lib/env";
import { createProviderStore } from "@/lib/fitness-store";
import {
  createOwUser,
  getOwAuthorizeUrl,
  listOwConnections,
  listOwHealthScores,
  listOwWorkouts,
  openWearablesWhoopPilotEnabled,
  revokeOwConnection,
  triggerOwSync,
} from "./client";
import {
  clearOwUserId,
  getOwUserId,
  setOwUserId,
} from "./user-link";

const PROVIDER = "whoop" as const;

async function ensureOwUser(userId: string): Promise<string> {
  const existing = await getOwUserId(userId);
  if (existing) return existing;
  const created = await createOwUser(null);
  await setOwUserId(userId, created.id);
  return created.id;
}

function disconnected(userId: string): FitnessConnection {
  return {
    userId,
    provider: PROVIDER,
    connectedAt: null,
    status: "disconnected",
  };
}

/**
 * WHOOP via Open Wearables. Same FitnessProvider surface as the direct adapter
 * so connect/sync/disconnect routes stay unchanged. Enable with
 * OPEN_WEARABLES_API_URL + OPEN_WEARABLES_API_KEY + OPEN_WEARABLES_WHOOP=true.
 */
export function createOwWhoopProvider(): FitnessProvider & {
  completeOAuth: (userId: string, _code?: string) => Promise<void>;
} {
  const store = createProviderStore(PROVIDER);

  return {
    id: PROVIDER,
    displayName: "WHOOP (Open Wearables)",

    async connect(userId: string): Promise<FitnessAuthResult> {
      if (!openWearablesWhoopPilotEnabled() || webEnv.useDemoData) {
        return {
          provider: PROVIDER,
          status: "stub",
          message:
            "Open Wearables WHOOP pilot is off. Set OPEN_WEARABLES_API_URL, OPEN_WEARABLES_API_KEY, OPEN_WEARABLES_WHOOP=true, and turn off demo data.",
        };
      }
      const owUserId = await ensureOwUser(userId);
      const redirectUri = `${webEnv.appUrl.replace(/\/$/, "")}/api/fitness/open-wearables/callback?provider=whoop`;
      const { authorization_url: authorizeUrl } = await getOwAuthorizeUrl(
        PROVIDER,
        owUserId,
        redirectUri,
      );
      await store?.setConnection({
        userId,
        provider: PROVIDER,
        connectedAt: null,
        status: "disconnected",
      });
      return {
        provider: PROVIDER,
        status: "disconnected",
        authorizeUrl,
        message: "Continue at WHOOP to authorize via Open Wearables.",
      };
    },

    async disconnect(userId: string): Promise<void> {
      const owUserId = await getOwUserId(userId);
      if (owUserId && openWearablesWhoopPilotEnabled()) {
        try {
          await revokeOwConnection(owUserId, PROVIDER);
        } catch {
          // Connection may already be gone on the OW side.
        }
      }
      await store?.deleteConnection(userId);
      await store?.deleteTokens(userId);
      await clearOwUserId(userId);
    },

    async getConnection(userId: string): Promise<FitnessConnection> {
      const local = (await store?.getConnection(userId)) ?? disconnected(userId);
      if (!openWearablesWhoopPilotEnabled()) return local;
      const owUserId = await getOwUserId(userId);
      if (!owUserId) return local;
      try {
        const connections = await listOwConnections(owUserId);
        const whoop = connections.find((item) => item.provider === PROVIDER);
        if (!whoop) return local.status === "connected" ? disconnected(userId) : local;
        const next: FitnessConnection = {
          userId,
          provider: PROVIDER,
          status: whoop.status === "active" ? "connected" : "disconnected",
          connectedAt: local.connectedAt ?? new Date().toISOString(),
          lastSyncAt: whoop.last_synced_at ?? local.lastSyncAt ?? null,
          lastActivityAt: local.lastActivityAt ?? null,
        };
        await store?.setConnection(next);
        return next;
      } catch {
        return local;
      }
    },

    async syncActivities(userId, options): Promise<SyncResult> {
      const syncedAt = new Date().toISOString();
      if (!openWearablesWhoopPilotEnabled() || webEnv.useDemoData) {
        return {
          provider: PROVIDER,
          activities: [],
          readiness: [],
          syncedAt,
          usedMock: true,
          since: options?.since,
        };
      }
      const owUserId = await ensureOwUser(userId);
      const connection = await this.getConnection(userId);
      if (connection.status !== "connected") {
        return {
          provider: PROVIDER,
          activities: [],
          readiness: [],
          syncedAt,
          usedMock: false,
          since: options?.since,
        };
      }
      const window = syncWindow({ lastSyncAt: options?.since ?? connection.lastSyncAt ?? null });
      try {
        await triggerOwSync(PROVIDER, owUserId, "all");
      } catch {
        // Pull whatever OW already has if sync enqueue fails.
      }
      const endDate = syncedAt;
      const [workouts, scores] = await Promise.all([
        listOwWorkouts(owUserId, window.since, endDate, PROVIDER),
        listOwHealthScores(owUserId, window.since.slice(0, 10), endDate.slice(0, 10), PROVIDER),
      ]);
      const activities = workouts
        .map((item) => mapOwWorkoutToActivity(item as OwWorkout, PROVIDER))
        .filter((item): item is NonNullable<typeof item> => item != null)
        .filter((item) => !options?.categorySlug || item.categorySlug === options.categorySlug);
      const readiness = scores
        .map((item) => mapOwHealthScoreToReadiness(item as OwHealthScore, PROVIDER))
        .filter((item): item is NonNullable<typeof item> => item != null);
      const newest = activities.map((item) => item.startedAt).sort().at(-1) ?? null;
      await store?.setConnection({
        userId,
        provider: PROVIDER,
        connectedAt: connection.connectedAt ?? syncedAt,
        status: "connected",
        lastSyncAt: syncedAt,
        lastActivityAt: newest ?? connection.lastActivityAt ?? null,
      });
      return {
        provider: PROVIDER,
        activities,
        readiness,
        syncedAt,
        usedMock: false,
        since: window.since,
      };
    },

    /** OW completes the OAuth code exchange itself; we only mark connected. */
    async completeOAuth(userId: string, _code?: string): Promise<void> {
      const connection = await this.getConnection(userId);
      await store?.setConnection({
        userId,
        provider: PROVIDER,
        connectedAt: connection.connectedAt ?? new Date().toISOString(),
        status: "connected",
        lastSyncAt: connection.lastSyncAt ?? null,
        lastActivityAt: connection.lastActivityAt ?? null,
      });
    },
  };
}
