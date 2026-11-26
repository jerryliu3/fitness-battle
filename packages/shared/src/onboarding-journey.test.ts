import { describe, expect, it } from "vitest";
import { guestIntroForAccount, parseGuestIntroDraft, ONBOARDING_GROWTH, ONBOARDING_STEPS, ONBOARDING_FEATURES, hasCompletedOnboardingIntro, onboardingCrewPreview, ONBOARDING_VITALS_METRICS, fitOnboardingCanvas, onboardingGrowthScore, onboardingCrewReplay } from "./onboarding-journey";

const draft = { sport: "walking", name: "Taylor", city: "Boston", countryCode: "US" };
describe("guest profile handoff", () => {
  it("keeps only profile preparation and rejects invalid stored drafts", () => {
    expect(parseGuestIntroDraft(JSON.stringify({ ...draft, score: 2200, onboardingCompleted: true }))).toEqual(draft);
    expect(parseGuestIntroDraft("null")).toBeNull();
    expect(parseGuestIntroDraft("broken")).toBeNull();
    expect(parseGuestIntroDraft(JSON.stringify({ ...draft, sport: "swimming" }))).toBeNull();
    expect(parseGuestIntroDraft(JSON.stringify({ name: "Taylor", city: "", countryCode: "" }))).toEqual({ name: "Taylor", city: "", countryCode: "" });
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

describe("onboarding growth", () => {
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

it("keeps the chosen name and photo in the crew preview without account writes", () => {
  const guest = { ...draft, sport: "strength" as const, photo: "data:image/jpeg;base64,/9j/" };
  const crew = onboardingCrewPreview(guest);
  expect(crew.members.find(m => m.user_id === "you")).toEqual({ user_id: "you", display_name: "Taylor", avatar_url: guest.photo });
  expect(crew.sport).toBe("strength");
  expect(ONBOARDING_VITALS_METRICS.every(m => m.value.length > 0)).toBe(true);
  expect(guest).not.toHaveProperty("healthRatings");
});

it.each([[320, 480, 640], [320, 488, 900], [375, 589, 640], [390, 760, 1200], [430, 840, 640]])("fits the complete onboarding canvas into %s × %s with content height %s", (width, height, content) => {
  const fitted = fitOnboardingCanvas(width, height, content);
  expect(fitted.width).toBeLessThanOrEqual(width + 1e-6);
  expect(fitted.height).toBeLessThanOrEqual(height + 1e-6);
  expect(fitted.scale).toBeGreaterThan(0);
});
it("replays presentation growth and crew progress without changing the guest draft", () => {
  expect(onboardingGrowthScore(0)).toBe(500);
  expect(onboardingGrowthScore(.5)).toBe(1120);
  expect(onboardingGrowthScore(1)).toBe(2000);
  const guest = { ...draft, sport: "running" as const };
  expect(onboardingCrewReplay(guest, 0).entries.every(e => e.distance_m === 0)).toBe(true);
  expect(onboardingCrewReplay(guest, 1).entries).toEqual(onboardingCrewPreview(guest).entries);
  expect(guest).not.toHaveProperty("score");
});
it.each(["running", "cycling", "walking", "strength"] as const)("shows a sport-specific weekly crew goal at 60 percent for %s", async sport => {
  const { onboardingCrewGoal } = await import("./onboarding-journey");
  const guest = { sport, name: "Taylor", city: "", countryCode: "" };
  const expected = { running: "18/30 km", cycling: "54/90 km", walking: "12,000/20,000 steps", strength: "3/5 hrs" };
  expect(onboardingCrewGoal(guest, 1)).toBe(`Weekly goal: ${expected[sport]}`);
  expect(onboardingCrewGoal(guest, 0)).toMatch(/^Weekly goal: 0\//);
});
