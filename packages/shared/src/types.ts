export type BattleMode = "group" | "one_v_one";

/** Default is weekly; daily/monthly/custom keep the period model extendable. */
export type PeriodKind = "daily" | "weekly" | "monthly" | "custom";

export type BattleStatus = "open" | "active" | "completed" | "cancelled";

export type MembershipRole = "owner" | "member";

export type FitnessProviderId =
  | "strava"
  | "mock"
  | "garmin"
  | "apple_health"
  | "google_health"
  | "whoop"
  | "oura";

export type CategorySlug = "running" | "cycling" | "walking" | "strength";

export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  slug: CategorySlug;
  name: string;
  unit: "meters" | "seconds";
  description: string;
}

export interface Battle {
  id: string;
  name: string;
  mode: BattleMode;
  categoryId: string;
  categorySlug: CategorySlug;
  periodKind: PeriodKind;
  status: BattleStatus;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
}

export interface BattleMembership {
  battleId: string;
  userId: string;
  displayName: string;
  role: MembershipRole;
  joinedAt: string;
}

export interface Period {
  id: string;
  battleId: string;
  kind: PeriodKind;
  startsAt: string;
  endsAt: string;
  isCurrent: boolean;
}

export interface StandingRow {
  periodId: string;
  userId: string;
  displayName: string;
  score: number;
  rank: number;
  isViewer: boolean;
}

export interface FitnessConnection {
  userId: string;
  provider: FitnessProviderId;
  connectedAt: string | null;
  status: "connected" | "disconnected" | "stub";
  lastSyncAt?: string | null;
  lastActivityAt?: string | null;
}

export interface ActivitySample {
  id: string;
  provider: FitnessProviderId;
  externalId: string;
  categorySlug: CategorySlug;
  startedAt: string;
  /** Distance meters for GPS sports, session seconds for strength. */
  metricValue: number;
  /** Moving time in seconds. Needed for pace; strength uses this as the metric. */
  movingSec?: number;
  avgHr?: number | null;
  rawName: string;
  /** Google Encoded Polyline for route thumbnails and quick maps. */
  summaryPolyline?: string | null;
  /** High-resolution Google Encoded Polyline for 3D flyovers. */
  detailedPolyline?: string | null;
  routeReplay?: import("./route-replay").RouteReplaySample[] | null;
  /** Total elevation gain in meters. */
  elevationGainM?: number | null;
  /** Bounding box [minLng, minLat, maxLng, maxLat]. */
  routeBounds?: [number, number, number, number] | null;
}

/** Daily recovery or sleep score from a readiness provider. */
export interface ReadinessSample {
  id: string;
  provider: FitnessProviderId;
  externalId: string;
  /** Calendar day, YYYY-MM-DD. */
  day: string;
  /** 0–100. */
  score: number;
}
