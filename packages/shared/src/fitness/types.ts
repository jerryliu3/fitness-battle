import type {
  ActivitySample,
  CategorySlug,
  FitnessConnection,
  FitnessProviderId,
} from "../types";

export interface FitnessAuthResult {
  provider: FitnessProviderId;
  status: FitnessConnection["status"];
  authorizeUrl?: string;
  message: string;
}

export interface SyncResult {
  provider: FitnessProviderId;
  activities: ActivitySample[];
  syncedAt: string;
  usedMock: boolean;
  /** ISO window start used for the pull, when known. */
  since?: string;
}

export interface FitnessProvider {
  id: FitnessProviderId;
  displayName: string;
  /** Start OAuth (or stub connect when credentials are missing). */
  connect(userId: string): Promise<FitnessAuthResult>;
  disconnect(userId: string): Promise<void>;
  getConnection(userId: string): Promise<FitnessConnection>;
  /**
   * Pull activities in a time window.
   * Prefer passing `since` from syncWindow(); omit to force a 90-day backfill.
   */
  syncActivities(
    userId: string,
    options?: { categorySlug?: CategorySlug; since?: string },
  ): Promise<SyncResult>;
}
