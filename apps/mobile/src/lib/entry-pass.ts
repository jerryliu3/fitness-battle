import { useMemo } from "react";
import { Platform } from "react-native";
import {
  ENTRY_PASS_PLANS,
  evaluateSportClaimAllowance,
  formatAthleteNumber,
  isEntitlementActive,
  isFoundingAthlete,
  type AthleteEntitlement,
  type CompeteState,
  type EntryPassPlan,
} from "@fitness-battle/shared";
import { mobileEnv } from "./env";

export interface UseEntryPassResult {
  entitlement: AthleteEntitlement | null;
  athleteNumber: number | null;
  isFoundingLifetime: boolean;
  isActive: boolean;
  badgeText: string;
  canClaimSport: (candidateSport: string) => {
    allowed: boolean;
    reason: "active_pass" | "single_sport_free" | "multi_sport_limit";
    message?: string;
  };
}

/**
 * React hook to evaluate the athlete's current Entry Pass status and sport enrollment eligibility.
 */
export function useEntryPass(
  state: CompeteState | null | undefined,
  options?: { isDemo?: boolean }
): UseEntryPassResult {
  return useMemo(() => {
    const athleteNumber = state?.athleteNumber ?? null;
    const isFounder = isFoundingAthlete(athleteNumber);
    const isDemo = Boolean(options?.isDemo);

    // If the athlete is within the first 10,000, they have founding lifetime entitlement.
    // If in demo mode, provide full demo entitlement.
    const entitlement: AthleteEntitlement | null =
      state?.entryPass ??
      (isFounder
        ? {
            tier: "founder_lifetime",
            status: "active",
            provider: "early_adopter_grant",
            expiresAt: null,
          }
        : isDemo
        ? {
            tier: "founder_lifetime",
            status: "active",
            provider: "demo",
            expiresAt: null,
          }
        : null);

    const active = isEntitlementActive(entitlement);

    let badgeText = "";
    if (athleteNumber != null && athleteNumber > 0) {
      const numLabel = formatAthleteNumber(athleteNumber);
      if (isFounder) {
        badgeText = `${numLabel} · Founding Lifetime`;
      } else if (active) {
        badgeText = `${numLabel} · Pass Active`;
      } else {
        badgeText = `${numLabel}`;
      }
    }

    const enrolledSports = (state?.enrollments ?? []).map((e) => e.sport);
    const sleepOptedIn = Boolean(
      state?.healthRatings?.some((r) => r.metric === "sleep" && r.optedIn)
    );

    const canClaimSport = (candidateSport: string) => {
      return evaluateSportClaimAllowance({
        entitlement,
        enrolledSports,
        candidateSport,
        sleepOptedIn,
      });
    };

    return {
      entitlement,
      athleteNumber,
      isFoundingLifetime: isFounder,
      isActive: active,
      badgeText,
      canClaimSport,
    };
  }, [state, options?.isDemo]);
}

/**
 * Purchases native bridge contract for StoreKit / Google Play Billing.
 * Designed to be safely called from UI without crashing in web or Expo Go dev mode.
 */
export interface PurchasesBridge {
  isConfigured: () => boolean;
  identifyUser: (userId: string) => Promise<void>;
  purchasePlan: (plan: EntryPassPlan) => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; error?: string }>;
}

let configured = false;

/**
 * Initialize RevenueCat with the active platform's API key.
 */
export async function initPurchases(userId?: string): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const apiKey =
    Platform.OS === "ios"
      ? mobileEnv.revenueCatApiKeyApple
      : mobileEnv.revenueCatApiKeyGoogle;

  if (!apiKey) {
    return false;
  }

  try {
    const Purchases = (await import("react-native-purchases")).default;
    Purchases.configure({ apiKey, appUserID: userId ?? null });
    configured = true;
    return true;
  } catch (error) {
    console.warn("RevenueCat native initialization deferred:", error instanceof Error ? error.message : "module unavailable");
    return false;
  }
}

/**
 * Primary purchases bridge implementing StoreKit / Google Play purchase and restore.
 */
export const purchasesBridge: PurchasesBridge = {
  isConfigured: () => configured,

  identifyUser: async (userId: string) => {
    if (Platform.OS === "web" || !configured) return;
    try {
      const Purchases = (await import("react-native-purchases")).default;
      await Purchases.logIn(userId);
    } catch (error) {
      console.warn("Purchases.logIn failed:", error instanceof Error ? error.message : "unknown");
    }
  },

  purchasePlan: async (plan: EntryPassPlan) => {
    if (Platform.OS === "web") {
      return { success: false, error: "In-app purchases must be made through the mobile app." };
    }

    const productId =
      Platform.OS === "ios" ? plan.storeProductIdApple : plan.storeProductIdGoogle;

    try {
      const Purchases = (await import("react-native-purchases")).default;
      if (!configured) {
        const initialized = await initPurchases();
        if (!initialized) {
          return {
            success: false,
            error: "In-app purchases are not configured for this build environment.",
          };
        }
      }

      await Purchases.purchaseProduct(productId);
      return { success: true };
    } catch (error) {
      const isUserCancel =
        error instanceof Error &&
        (error.message.includes("cancelled") || (error as unknown as { userCancelled?: boolean }).userCancelled);

      if (isUserCancel) {
        return { success: false, error: "purchase_cancelled" };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Could not complete purchase with the store.",
      };
    }
  },

  restorePurchases: async () => {
    if (Platform.OS === "web") {
      return { success: false, error: "Purchase restoration is only supported on mobile devices." };
    }

    try {
      const Purchases = (await import("react-native-purchases")).default;
      if (!configured) await initPurchases();
      const customerInfo = await Purchases.restorePurchases();
      const active = Object.keys(customerInfo?.entitlements?.active ?? {}).length > 0;
      return {
        success: active,
        error: active ? undefined : "No active Entry Pass found for this App Store account.",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Could not restore purchases.",
      };
    }
  },
};
