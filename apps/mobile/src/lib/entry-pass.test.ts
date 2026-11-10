import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

import { freshState } from "@fitness-battle/shared";
import { computeEntryPass } from "./entry-pass";

describe("computeEntryPass", () => {
  it("grants founding lifetime pass for athlete #42", () => {
    const state = {
      ...freshState(),
      athleteNumber: 42,
    };

    const pass = computeEntryPass(state);
    expect(pass.isFoundingLifetime).toBe(true);
    expect(pass.isActive).toBe(true);
    expect(pass.badgeText).toBe("#42 · Founding Lifetime");
    expect(pass.canClaimSport("running").allowed).toBe(true);
    expect(pass.canClaimSport("cycling").allowed).toBe(true);
  });

  it("permits 1 sport free for non-founder without pass, blocks second sport", () => {
    const state = {
      ...freshState(),
      athleteNumber: 10450,
      enrollments: [
        {
          sport: "running" as const,
          waveStart: "2026-11-09T11:00:00Z",
          weekEnd: "2026-11-16T11:00:00Z",
          capacity: 8,
          peerIds: [],
          syntheticIds: [],
          autoEnrollNext: true,
          crewId: null,
        },
      ],
    };

    const pass = computeEntryPass(state);
    expect(pass.isFoundingLifetime).toBe(false);
    expect(pass.isActive).toBe(false);
    expect(pass.badgeText).toBe("#10,450");

    // Re-claiming running is allowed
    expect(pass.canClaimSport("running").allowed).toBe(true);

    // Claiming second sport (cycling) is blocked
    const cyclingClaim = pass.canClaimSport("cycling");
    expect(cyclingClaim.allowed).toBe(false);
    expect(cyclingClaim.reason).toBe("multi_sport_limit");

    // Sleep is also blocked without pass
    const sleepClaim = pass.canClaimSport("sleep");
    expect(sleepClaim.allowed).toBe(false);
  });

  it("allows multi-sport for non-founder with active monthly subscription", () => {
    const state = {
      ...freshState(),
      athleteNumber: 12000,
      entryPass: {
        tier: "monthly_pass" as const,
        status: "active" as const,
        provider: "apple" as const,
        expiresAt: "2026-12-01T00:00:00Z",
      },
      enrollments: [
        {
          sport: "running" as const,
          waveStart: "2026-11-09T11:00:00Z",
          weekEnd: "2026-11-16T11:00:00Z",
          capacity: 8,
          peerIds: [],
          syntheticIds: [],
          autoEnrollNext: true,
          crewId: null,
        },
      ],
    };

    const pass = computeEntryPass(state);
    expect(pass.isFoundingLifetime).toBe(false);
    expect(pass.isActive).toBe(true);
    expect(pass.badgeText).toBe("#12,000 · Pass Active");
    expect(pass.canClaimSport("cycling").allowed).toBe(true);
  });
});
