/**
 * Platform-agnostic types and data models for redesigned UI layout prototypes.
 * Zero DOM, Expo, or React Native imports.
 */

export type ScreenId = "home" | "arena" | "crew" | "athlete";

export type SportCategory = "gps" | "non_gps" | "tracking";

export interface SportSpec {
  id: string;
  name: string;
  category: SportCategory;
  unit: "km" | "min" | "hrs" | "bpm";
  iconName: string;
  isGps: boolean;
  description: string;
}

export const SUPPORTED_SPORTS: SportSpec[] = [
  // GPS sports
  { id: "running", name: "Running", category: "gps", unit: "km", iconName: "run", isGps: true, description: "Outdoor GPS route & pace tracking" },
  { id: "cycling", name: "Cycling", category: "gps", unit: "km", iconName: "bike", isGps: true, description: "Road & gravel GPS tracking" },
  { id: "walking", name: "Walking", category: "gps", unit: "km", iconName: "walk", isGps: true, description: "Daily steps and outdoor distance" },
  { id: "trail_running", name: "Trail Running", category: "gps", unit: "km", iconName: "trail", isGps: true, description: "Elevation gain & rugged trail routes" },
  // Non-GPS sports
  { id: "swimming", name: "Swimming", category: "non_gps", unit: "km", iconName: "swim", isGps: false, description: "Lap tracking & indoor pool sets" },
  { id: "strength", name: "Strength Training", category: "non_gps", unit: "min", iconName: "dumbbell", isGps: false, description: "Resistance, hypertrophy & barbell sessions" },
  { id: "indoor_cardio", name: "Indoor Exercises", category: "non_gps", unit: "min", iconName: "treadmill", isGps: false, description: "Rowing, treadmill, elliptical & HIIT" },
  // Tracking
  { id: "heart_rate", name: "Heart Rate", category: "tracking", unit: "bpm", iconName: "heart", isGps: false, description: "Continuous resting HR & zone telemetry" },
  { id: "sleep", name: "Sleep & Recovery", category: "tracking", unit: "hrs", iconName: "moon", isGps: false, description: "Sleep stages, HRV & readiness rating" },
];

export interface PrototypeHomeSession {
  id: string;
  dayIndex: number;
  dateIso: string;
  dayLabel: string;
  weekdayShort: string;
  sportId: string;
  sportName: string;
  volume: string;
  numericVolume: number;
  unit: string;
  durationMin: number;
  avgHr?: number;
  pace?: string;
  status: "completed" | "current" | "future";
  summary: string;
}

export interface PrototypeDailyRecommendation {
  id: string;
  dateLabel: string;
  sportId: string;
  sportName: string;
  title: string;
  subtitle: string;
  durationMin: number;
  targetVolume: string;
  targetHrZone: string;
  effortRating: "Recovery" | "Moderate" | "Threshold" | "VO2 Max";
  rationale: string;
  structure: {
    warmup: string;
    mainSet: string;
    cooldown: string;
  };
  tips: string[];
}

export interface ArenaCompetitor {
  id: string;
  rank: number;
  name: string;
  avatarSeed: string;
  sportId: string;
  distanceKm: number;
  movingHours: number;
  pace: string;
  leoScore: number;
  isYou: boolean;
  isGhost: boolean;
  deltaPace: string;
  rankTrend: "up" | "down" | "steady";
  crewTag?: string;
}

export interface GhostComparison {
  ghostName: string;
  ghostType: "past_week" | "personal_best";
  distanceKm: number;
  pace: string;
  deltaKm: number;
  ahead: boolean;
  telemetry: {
    checkpoint: string;
    youKm: number;
    ghostKm: number;
  }[];
}

export interface AchievementItem {
  id: string;
  title: string;
  subtitle: string;
  competition: string;
  tier: "gold" | "silver" | "bronze";
  icon: string;
  earnedDate: string;
  description: string;
}

export interface GlobalRecordRank {
  rank: number;
  athleteName: string;
  country: string;
  category: "5k" | "10k" | "half_marathon";
  finishTime: string;
  avgPace: string;
  date: string;
  isYou?: boolean;
}

export interface AvailableCompetition {
  id: string;
  title: string;
  sportId: string;
  division: string;
  tier: string;
  registrationStatus: "open" | "closing_soon" | "full";
  closesInDays: number;
  participantCount: number;
  format: "solo" | "crew" | "both";
  description: string;
}

export interface CrewMember {
  id: string;
  name: string;
  avatarSeed: string;
  role: "Captain" | "Lieutenant" | "Pacer" | "Member";
  weeklyKm: number;
  streakDays: number;
  lastActiveLabel: string;
  status: "active" | "resting" | "slacking";
}

export interface CrewActivityFeedItem {
  id: string;
  memberId: string;
  memberName: string;
  avatarSeed: string;
  sportId: string;
  sportName: string;
  timestamp: string;
  title: string;
  distanceOrDuration: string;
  paceOrIntensity?: string;
  cheersCount: number;
  nudgesCount: number;
  userCheered?: boolean;
}

export interface CrewDetails {
  id: string;
  name: string;
  tag: string;
  motto: string;
  inviteCode: string;
  rank: number;
  totalMembers: number;
  maxMembers: number;
  weeklyGoalKm: number;
  weeklyCurrentKm: number;
  activeMatchup?: {
    rivalCrewName: string;
    rivalKm: number;
    leadKm: number;
  };
}

export interface AthleteProfile {
  name: string;
  handle: string;
  city: string;
  avatarSeed: string;
  leoScore: number;
  division: string;
  tier: string;
  memberSince: string;
  bio: string;
  totalWorkouts: number;
  totalDistanceKm: number;
}

export interface SensorStatus {
  id: string;
  name: string;
  kind: "gps" | "biometric" | "wearable";
  status: "connected" | "disconnected" | "syncing";
  lastSyncLabel: string;
}

export interface AthleteAnalytics {
  leoTrend: { period: string; score: number }[];
  weeklyVolume: { weekLabel: string; km: number; sessions: number }[];
  sportBreakdown: { sportId: string; sportName: string; percentage: number; isGps: boolean }[];
  recoveryTelemetry: {
    restingHr: number;
    sleepHoursAvg: number;
    hrvMs: number;
    readinessScore: number;
  };
}

export interface BackfillProgressStep {
  provider: string;
  label: string;
  importedSessions: number;
  baselineScore: number;
  status: "pending" | "running" | "completed";
}

export interface WeekCompletionPodium {
  weekLabel: string;
  place: number;
  fieldSize: number;
  effortKm: number;
  leoDelta: number;
  badgeAwarded: string;
  rivalDefeated: string;
}

export interface ReturnSyncProgress {
  newActivitiesCount: number;
  totalAddedKm: number;
  gainedLeoScore: number;
  passedRivalName: string;
  latestWorkout: {
    sportName: string;
    distance: string;
    duration: string;
  };
}
