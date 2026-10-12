import type {
  ActivitySample,
  CategorySlug,
  FitnessConnection,
} from "../types";
import type {
  FitnessAuthResult,
  FitnessProvider,
  SyncResult,
} from "./types";

const connected = new Map<string, FitnessConnection>();

function mockActivities(
  userId: string,
  categorySlug: CategorySlug = "running",
): ActivitySample[] {
  const now = Date.now();
  return [
    {
      id: `mock-${userId}-1`,
      provider: "mock",
      externalId: `mock-ext-1-${userId}`,
      categorySlug,
      startedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      metricValue: categorySlug === "strength" ? 120 : 5200,
      rawName: `Mock ${categorySlug} session`,
    },
    {
      id: `mock-${userId}-2`,
      provider: "mock",
      externalId: `mock-ext-2-${userId}`,
      categorySlug,
      startedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      metricValue: categorySlug === "strength" ? 90 : 3100,
      rawName: `Mock ${categorySlug} follow-up`,
    },
  ];
}

export const mockFitnessProvider: FitnessProvider = {
  id: "mock",
  displayName: "Mock Tracker",
  async connect(userId) {
    const connection: FitnessConnection = {
      userId,
      provider: "mock",
      connectedAt: new Date().toISOString(),
      status: "connected",
    };
    connected.set(userId, connection);
    const result: FitnessAuthResult = {
      provider: "mock",
      status: "connected",
      message: "Connected to mock fitness tracker (no OAuth keys required).",
    };
    return result;
  },
  async disconnect(userId) {
    connected.delete(userId);
  },
  async getConnection(userId) {
    return (
      connected.get(userId) ?? {
        userId,
        provider: "mock",
        connectedAt: null,
        status: "disconnected",
      }
    );
  },
  async syncActivities(userId, options) {
    const slug = options?.categorySlug ?? "running";
    const result: SyncResult = {
      provider: "mock",
      activities: mockActivities(userId, slug),
      syncedAt: new Date().toISOString(),
      usedMock: true,
    };
    return result;
  },
};
