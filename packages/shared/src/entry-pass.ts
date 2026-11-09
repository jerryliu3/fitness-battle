/**
-- ---------------------------------------------------------------------------
-- Entry Pass & In-App Purchase Domain Models
--
-- Pure TypeScript platform-agnostic entitlement and multi-sport allowance logic.
-- Used across apps/mobile, apps/web, and backend persisters.
-- ---------------------------------------------------------------------------
*/

export const FOUNDING_ATHLETE_LIMIT = 10_000;

export type EntryPassTier =
  | "founder_lifetime"
  | "monthly_pass"
  | "annual_pass"
  | "lifetime_pass"
  | "complimentary"
  | "none";

export type EntryPassStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "expired"
  | "trialing"
  | "none";

export type EntryPassProvider =
  | "early_adopter_grant"
  | "apple"
  | "google"
  | "stripe"
  | "admin"
  | "demo";

export interface AthleteEntitlement {
  tier: EntryPassTier;
  status: EntryPassStatus;
  provider: EntryPassProvider;
  productId?: string | null;
  currentPeriodStart?: string;
  expiresAt?: string | null; // null represents lifetime access
  cancelAtPeriodEnd?: boolean;
}

export interface EntryPassPlan {
  id: string;
  tier: EntryPassTier;
  interval: "month" | "year" | "lifetime";
  priceUsd: number;
  priceDisplay: string;
  title: string;
  badge?: string;
  description: string;
  storeProductIdApple: string;
  storeProductIdGoogle: string;
}

export const ENTRY_PASS_PLANS: Record<"monthly" | "annual" | "lifetime", EntryPassPlan> = {
  monthly: {
    id: "entry_pass_monthly",
    tier: "monthly_pass",
    interval: "month",
    priceUsd: 0.99,
    priceDisplay: "$0.99 / mo",
    title: "Monthly Pass",
    description: "Unlimited multi-sport waves and sleep meets. Auto-renews monthly.",
    storeProductIdApple: "xyz.overtaek.pass.monthly.099",
    storeProductIdGoogle: "xyz.overtaek.pass.monthly.099",
  },
  annual: {
    id: "entry_pass_annual",
    tier: "annual_pass",
    interval: "year",
    priceUsd: 9.99,
    priceDisplay: "$9.99 / yr",
    title: "Annual Pass",
    badge: "Save 16%",
    description: "Full year of multi-sport and sleep competition. Auto-renews annually.",
    storeProductIdApple: "xyz.overtaek.pass.annual.999",
    storeProductIdGoogle: "xyz.overtaek.pass.annual.999",
  },
  lifetime: {
    id: "entry_pass_lifetime",
    tier: "lifetime_pass",
    interval: "lifetime",
    priceUsd: 49.0,
    priceDisplay: "$49.00",
    title: "Lifetime Pass",
    badge: "One-time",
    description: "Pay once, keep lifetime access across every sport and future meet.",
    storeProductIdApple: "xyz.overtaek.pass.lifetime.4900",
    storeProductIdGoogle: "xyz.overtaek.pass.lifetime.4900",
  },
};

/**
 * Returns true if the entitlement gives active access at the specified time.
 */
export function isEntitlementActive(
  entitlement: AthleteEntitlement | null | undefined,
  now: Date = new Date()
): boolean {
  if (!entitlement) return false;
  if (entitlement.status !== "active" && entitlement.status !== "trialing") return false;
  if (entitlement.tier === "founder_lifetime" || entitlement.tier === "lifetime_pass") return true;
  if (!entitlement.expiresAt) return true;
  return new Date(entitlement.expiresAt) > now;
}

export interface PassAllowanceCheck {
  allowed: boolean;
  reason: "active_pass" | "single_sport_free" | "multi_sport_limit";
  message?: string;
}

/**
 * Option A Evaluator:
 * - 1 sport is free for any athlete.
 * - An active Entry Pass (Founding lifetime, monthly $0.99, annual $9.99, or lifetime $49)
 *   is required to participate in >1 sport simultaneously or sport + sleep meet.
 */
export function evaluateSportClaimAllowance({
  entitlement,
  enrolledSports,
  candidateSport,
  sleepOptedIn = false,
  now = new Date(),
}: {
  entitlement?: AthleteEntitlement | null;
  enrolledSports: string[];
  candidateSport: string;
  sleepOptedIn?: boolean;
  now?: Date;
}): PassAllowanceCheck {
  if (isEntitlementActive(entitlement, now)) {
    return { allowed: true, reason: "active_pass" };
  }

  const activeSet = new Set(enrolledSports);
  if (sleepOptedIn) activeSet.add("sleep");

  // If the candidate sport is already part of the active roster (e.g. re-registering or updating), allowed
  if (activeSet.has(candidateSport)) {
    return { allowed: true, reason: "single_sport_free" };
  }

  // If they already have 1 or more sports active, claiming another requires an Entry Pass
  if (activeSet.size >= 1) {
    return {
      allowed: false,
      reason: "multi_sport_limit",
      message: "An Entry Pass ($0.99/mo) is required to compete in more than one sport at a time.",
    };
  }

  // First sport claim is always free
  return { allowed: true, reason: "single_sport_free" };
}

/**
 * Returns true if the athlete number qualifies for the founding lifetime allocation (1..10,000).
 */
export function isFoundingAthlete(athleteNumber: number | null | undefined): boolean {
  return typeof athleteNumber === "number" && athleteNumber > 0 && athleteNumber <= FOUNDING_ATHLETE_LIMIT;
}

/**
 * Formats an athlete's sequential number for badge display (e.g. "#4,182").
 */
export function formatAthleteNumber(athleteNumber: number | null | undefined): string {
  if (typeof athleteNumber !== "number" || athleteNumber <= 0) return "";
  return `#${athleteNumber.toLocaleString("en-US")}`;
}
