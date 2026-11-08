import { describe, expect, it } from "vitest";
import { freshState, reduceCompete } from "./compete/engine";
import { eventRegistration } from "./event-registration";

describe("event registration package", () => {
  it("explains the actual strength scoring and next-wave commitment", () => {
    const now = new Date("2026-11-08T04:00:00Z");
    const detail = eventRegistration(freshState(now), "strength", now);
    expect(detail.title).toBe("Weekly Strength Meet");
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
    expect(eventRegistration(state, "walking", now).details[3]?.summary).toBe("Open");
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
