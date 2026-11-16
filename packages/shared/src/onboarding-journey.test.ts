import { describe, expect, it } from "vitest";
import { guestIntroForAccount, parseGuestIntroDraft, parseOnboardingWeeklyVolumes, onboardingDeclaredVolume, ONBOARDING_GROWTH } from "./onboarding-journey";

const draft = { sport: "walking", name: "Taylor", city: "Boston", countryCode: "US" };
describe("guest profile handoff", () => {
  it("keeps only profile preparation and rejects invalid stored drafts", () => {
    expect(parseGuestIntroDraft(JSON.stringify({ ...draft, score: 2200, onboardingCompleted: true }))).toEqual(draft);
    expect(parseGuestIntroDraft("null")).toBeNull();
    expect(parseGuestIntroDraft("broken")).toBeNull();
    expect(parseGuestIntroDraft(JSON.stringify({ ...draft, sport: "swimming" }))).toBeNull();
    expect(parseGuestIntroDraft(JSON.stringify({ ...draft, name: "x".repeat(100), countryCode: "invalid" }))).toEqual({ ...draft, name: "x".repeat(80), countryCode: "" });
  });
  it("imports only for the intended signup account", () => {
    const parsed = parseGuestIntroDraft(JSON.stringify(draft));
    expect(guestIntroForAccount(parsed, " Taylor@EXAMPLE.com ", "taylor@example.com")).toEqual(draft);
    expect(guestIntroForAccount(parsed, "taylor@example.com", "someone@example.com")).toBeNull();
    expect(guestIntroForAccount(parsed, null, "taylor@example.com")).toBeNull();
    expect(guestIntroForAccount(parsed, "taylor@example.com", null)).toBeNull();
  });
});

describe("weekly volume integration", () => {
  it("restores only supported string declarations", () => {
    expect(parseOnboardingWeeklyVolumes({ running: "7", walking: 28000, swimming: "10" })).toEqual({ running: "7" });
    expect(parseOnboardingWeeklyVolumes(null)).toEqual({});
  });
  it.each([
    ["running", "7", "us", 11265.408], ["cycling", "40", "metric", 40000],
    ["walking", "28000", "us", 28000], ["strength", "120", "metric", 7200],
    ["running", "0", "us", 0], ["running", "", "us", undefined],
    ["strength", " ", "us", undefined], ["walking", "-1", "metric", undefined],
    ["running", "invalid", "us", undefined], ["running", "1e308", "us", undefined],
  ] as const)("converts %s %s %s to native volume", (sport, value, units, native) => {
    expect(onboardingDeclaredVolume(sport, value, units)).toBe(native);
  });
  it("keeps potential promotion on the current score scale", () => {
    expect(ONBOARDING_GROWTH.from.id).toBe("active");
    expect(ONBOARDING_GROWTH.to.id).toBe("challenger");
    expect(ONBOARDING_GROWTH.scores[0]).toBe(2500);
    expect(ONBOARDING_GROWTH.scores.at(-1)).toBe(3750);
  });
});
