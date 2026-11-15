import { describe, expect, it } from "vitest";
import { freshState, reduceCompete } from "./compete/engine";
import { eventRegistration, entryBarcode, registrationDetailCards, registrationTicketRows } from "./event-registration";

describe("event registration package", () => {
  it("explains the actual strength scoring and next-wave commitment", () => {
    const now = new Date("2026-11-08T04:00:00Z");
    const detail = eventRegistration(freshState(now), "strength", now);
    expect(detail.title).toBe("Weekly Strength");
    expect(detail.details[0]?.summary).toBe("Training effort points");
    expect(detail.details[0]?.detail).toContain("Lift weights and rep totals are not scored");
    expect(detail.starts).toContain("Nov 8");
    expect(detail.starts).toContain("6:00 AM");
    expect(detail.ends).toContain("Nov 8");
    expect(detail.ends).toContain("11:59 PM");
    expect(detail.renewal).toContain("Cancel before");
  });
  it("keeps track eligibility and sleep coverage explicit", () => {
    const now = new Date("2026-11-08T12:00:00Z"), state = freshState(now);
    expect(eventRegistration(state, "running", now).details[3]?.detail).toContain("GPS-verified");
    expect(eventRegistration(state, "walking", now).details[3]?.summary).toBe("Daily step totals");
    expect(eventRegistration(state, "sleep", now).details[0]?.detail).toContain("Missing nights reduce");
  });
});

it("uses the registered wave for the ticket stamp after the next daily cutoff", () => {
  const joined = new Date("2026-11-08T12:00:00Z");
  const state = reduceCompete(freshState(joined), { type: "opt-in", sport: "running", now: joined.toISOString() });
  const detail = eventRegistration(state, "running", new Date("2026-11-09T12:00:00Z"));
  expect(detail.start).toBe(state.enrollments[0]!.waveStart);
  expect(detail.dateRange).toBe("Nov 9 – Nov 15");
  expect(detail.stampYear).toBe("2026");
});

it("returns three flippable rule cards for scoring, schedule, and entry tier", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  const detail = eventRegistration(freshState(now), "walking", now);
  const cards = registrationDetailCards(detail);
  expect(cards.map(card => card.title)).toEqual(["Scoring", "Schedule", "Entry tier"]);
  expect(cards.map(card => card.summary)).toEqual(["Total steps", "Weekly rounds", detail.details[2]!.summary]);
  expect(cards[0]!.detail).toBe(detail.details[0]!.detail);
  expect(cards[0]!.footnote).toBe(detail.details[3]!.summary);
  expect(cards[1]!.detail).toBe(detail.renewal);
  expect(cards[2]!.detail).toBe(detail.details[2]!.detail);
  expect(registrationTicketRows(detail).map(row => row.label)).toEqual(["Entry tier", "Starts", "Ends", "Scoring", "Field"]);
  expect(registrationTicketRows(detail)[2]?.value).toBe(detail.ends);
  expect(entryBarcode("walking:week-a")).toHaveLength(60);
  expect(entryBarcode("walking:week-a")).not.toEqual(entryBarcode("walking:week-b"));
});
