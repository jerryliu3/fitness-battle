import { describe, expect, it } from "vitest";
import {
  ENTRY_PASS_PLANS,
  evaluateSportClaimAllowance,
  formatAthleteNumber,
  isEntitlementActive,
  isFoundingAthlete,
  type AthleteEntitlement,
} from "./entry-pass";

describe("entry-pass domain logic", () => {
  const baseNow = new Date("2026-11-08T12:00:00Z");

  describe("isEntitlementActive", () => {
    it("returns false for null or undefined entitlement", () => {
      expect(isEntitlementActive(null, baseNow)).toBe(false);
      expect(isEntitlementActive(undefined, baseNow)).toBe(false);
    });

    it("returns false if status is canceled or expired", () => {
      const canceled: AthleteEntitlement = {
        tier: "monthly_pass",
        status: "canceled",
        provider: "apple",
        expiresAt: "2026-11-10T12:00:00Z",
      };
      expect(isEntitlementActive(canceled, baseNow)).toBe(false);
    });

    it("returns true for founder_lifetime regardless of expiration date", () => {
      const founder: AthleteEntitlement = {
        tier: "founder_lifetime",
        status: "active",
        provider: "early_adopter_grant",
        expiresAt: null,
      };
      expect(isEntitlementActive(founder, baseNow)).toBe(true);
    });

    it("returns true for lifetime_pass regardless of expiration date", () => {
      const lifetime: AthleteEntitlement = {
        tier: "lifetime_pass",
        status: "active",
        provider: "apple",
        expiresAt: null,
      };
      expect(isEntitlementActive(lifetime, baseNow)).toBe(true);
    });

    it("returns true for unexpired monthly pass and false after expiration", () => {
      const activeMonthly: AthleteEntitlement = {
        tier: "monthly_pass",
        status: "active",
        provider: "apple",
        expiresAt: "2026-11-10T12:00:00Z",
      };
      expect(isEntitlementActive(activeMonthly, baseNow)).toBe(true);

      const pastNow = new Date("2026-11-11T12:00:00Z");
      expect(isEntitlementActive(activeMonthly, pastNow)).toBe(false);
    });
  });

  describe("evaluateSportClaimAllowance (Option A)", () => {
    it("allows any sport if user has an active pass", () => {
      const pass: AthleteEntitlement = {
        tier: "monthly_pass",
        status: "active",
        provider: "apple",
        expiresAt: "2026-12-01T00:00:00Z",
      };

      const result = evaluateSportClaimAllowance({
        entitlement: pass,
        enrolledSports: ["running", "cycling"],
        candidateSport: "walking",
        sleepOptedIn: true,
        now: baseNow,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("active_pass");
    });

    it("allows the first sport for free when user has no pass", () => {
      const result = evaluateSportClaimAllowance({
        entitlement: null,
        enrolledSports: [],
        candidateSport: "running",
        sleepOptedIn: false,
        now: baseNow,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("single_sport_free");
    });

    it("allows re-claiming or updating an already enrolled sport for free", () => {
      const result = evaluateSportClaimAllowance({
        entitlement: null,
        enrolledSports: ["running"],
        candidateSport: "running",
        sleepOptedIn: false,
        now: baseNow,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("single_sport_free");
    });

    it("blocks claiming a second sport if user has 1 active sport and no pass", () => {
      const result = evaluateSportClaimAllowance({
        entitlement: null,
        enrolledSports: ["running"],
        candidateSport: "cycling",
        sleepOptedIn: false,
        now: baseNow,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("multi_sport_limit");
      expect(result.message).toContain("Entry Pass");
    });

    it("blocks claiming a sport if sleep is already opted in and user has no pass", () => {
      const result = evaluateSportClaimAllowance({
        entitlement: null,
        enrolledSports: [],
        candidateSport: "running",
        sleepOptedIn: true,
        now: baseNow,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("multi_sport_limit");
    });
  });

  describe("athlete numbering & badge helpers", () => {
    it("identifies founding athletes within the 10,000 threshold", () => {
      expect(isFoundingAthlete(1)).toBe(true);
      expect(isFoundingAthlete(500)).toBe(true);
      expect(isFoundingAthlete(10000)).toBe(true);
      expect(isFoundingAthlete(10001)).toBe(false);
      expect(isFoundingAthlete(0)).toBe(false);
      expect(isFoundingAthlete(null)).toBe(false);
      expect(isFoundingAthlete(undefined)).toBe(false);
    });

    it("formats athlete numbers nicely with comma separation", () => {
      expect(formatAthleteNumber(1)).toBe("#1");
      expect(formatAthleteNumber(4182)).toBe("#4,182");
      expect(formatAthleteNumber(10000)).toBe("#10,000");
      expect(formatAthleteNumber(null)).toBe("");
      expect(formatAthleteNumber(0)).toBe("");
    });

    it("defines the standard plans correctly", () => {
      expect(ENTRY_PASS_PLANS.monthly.priceUsd).toBe(0.99);
      expect(ENTRY_PASS_PLANS.annual.priceUsd).toBe(9.99);
      expect(ENTRY_PASS_PLANS.lifetime.priceUsd).toBe(49.0);
    });
  });
});
