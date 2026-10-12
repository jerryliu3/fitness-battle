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
}

export interface FitnessProvider {
  id: FitnessProviderId;
  displayName: string;
  /** Start OAuth (or stub connect when credentials are missing). */
  connect(userId: string): Promise<FitnessAuthResult>;
  disconnect(userId: string): Promise<void>;
  getConnection(userId: string): Promise<FitnessConnection>;
  /** Pull recent activities; filterable by category slug. */
  syncActivities(
    userId: string,
    options?: { categorySlug?: CategorySlug; since?: string },
  ): Promise<SyncResult>;
}
