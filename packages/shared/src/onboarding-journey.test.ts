import { describe, expect, it } from "vitest";
import { guestIntroForAccount, parseGuestIntroDraft, parseOnboardingWeeklyVolumes, onboardingDeclaredVolume, ONBOARDING_GROWTH, ONBOARDING_STEPS, ONBOARDING_FEATURES, hasCompletedOnboardingIntro } from "./onboarding-journey";

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
  it("uses a clearly illustrative growth scale without rank promises", () => {
    expect(ONBOARDING_GROWTH.scores[0]).toBe(500);
    expect(ONBOARDING_GROWTH.scores.at(-1)).toBe(2000);
    expect(ONBOARDING_GROWTH.scores).toEqual([...ONBOARDING_GROWTH.scores].sort((a, b) => a - b));
    expect(ONBOARDING_GROWTH.pointLabels).toHaveLength(ONBOARDING_GROWTH.scores.length);
  });
  it("keeps the same five onboarding stages and feature previews on both clients", () => {
    expect(ONBOARDING_STEPS).toEqual(["sport", "athlete", "overtake", "growth", "account"]);
    expect(ONBOARDING_FEATURES.map(feature => feature.id)).toEqual(["growth", "crews", "vitals"]);
  });
});

it("only skips the introduction when it was completed for the current account", () => {
  const completed = parseGuestIntroDraft(JSON.stringify({ sport: "running", name: "Taylor", introCompleted: true }));
  expect(hasCompletedOnboardingIntro(completed, "taylor@example.com", "taylor@example.com")).toBe(true);
  expect(hasCompletedOnboardingIntro(completed, "taylor@example.com", "someone@example.com")).toBe(false);
  expect(hasCompletedOnboardingIntro({ ...completed!, introCompleted: false }, "taylor@example.com", "taylor@example.com")).toBe(false);
});

it("retains a bounded JPEG photo without importing arbitrary URLs or oversized data", () => {
  const photo = "data:image/jpeg;base64,/9j/";
  expect(parseGuestIntroDraft(JSON.stringify({ ...draft, photo }))?.photo).toBe(photo);
  for (const invalid of ["javascript:alert(1)", "https://example.com/photo.jpg", "data:image/jpeg;base64," + "a".repeat(1_500_000)]) {
    expect(parseGuestIntroDraft(JSON.stringify({ ...draft, photo: invalid }))?.photo).toBeUndefined();
  }
});
