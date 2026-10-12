export type BattleMode = "group" | "one_v_one";

/** Default is weekly; daily/monthly/custom keep the period model extendable. */
export type PeriodKind = "daily" | "weekly" | "monthly" | "custom";

export type BattleStatus = "open" | "active" | "completed" | "cancelled";

export type MembershipRole = "owner" | "member";

export type FitnessProviderId = "strava" | "mock";

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
}

export interface ActivitySample {
  id: string;
  provider: FitnessProviderId;
  externalId: string;
  categorySlug: CategorySlug;
  startedAt: string;
  /** Distance meters, duration seconds, or reps depending on category. */
  metricValue: number;
  rawName: string;
}
