import { describe, expect, it } from "vitest";
import { guestIntroForAccount, parseGuestIntroDraft } from "./onboarding-journey";

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
