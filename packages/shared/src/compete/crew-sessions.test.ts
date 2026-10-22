import { describe, expect, it, vi } from "vitest";
import {
  crewSessionInstant,
  validateCrewSessionDraft,
  demoCrewSessionMutation,
  type CrewSessionMutation,
} from "./crew-sessions";
describe("crew session wall time", () => {
  it("resolves Eastern summer and winter offsets", () => {
    expect(crewSessionInstant("2026-10-24", "08:00")).toBe(
      "2026-10-24T12:00:00.000Z",
    );
    expect(crewSessionInstant("2026-11-07", "08:00")).toBe(
      "2026-11-07T13:00:00.000Z",
    );
  });
  it("rejects DST gaps and invalid calendar days", () => {
    expect(() => crewSessionInstant("2027-03-14", "02:30")).toThrow();
    expect(() => crewSessionInstant("2026-02-30", "08:00")).toThrow();
  });
  it("chooses the earlier occurrence of a repeated clock time", () => {
    expect(crewSessionInstant("2026-11-01", "01:30")).toBe(
      "2026-11-01T05:30:00.000Z",
    );
    vi.restoreAllMocks();
  });
});

describe("Start Line draft and demo lifecycle", () => {
  const now = new Date("2026-10-21T12:00:00Z");
  const draft: CrewSessionMutation = {
    action: "create",
    id: "session",
    crewId: "crew",
    title: " Easy run ",
    startsAt: "2026-10-24T12:00:00Z",
    durationMin: 30,
    timeZone: "America/New_York",
  };
  it("explains missing fields and rejects past starts and invalid durations", () => {
    expect(() => validateCrewSessionDraft("", "", "", 30, now)).toThrow("name");
    expect(() => validateCrewSessionDraft("Run", "", "08:00", 30, now)).toThrow(
      "date and time",
    );
    expect(() =>
      validateCrewSessionDraft("Run", "2026-10-20", "08:00", 30, now),
    ).toThrow("future");
    expect(() =>
      validateCrewSessionDraft("Run", "2026-10-24", "08:00", 2, now),
    ).toThrow("15–240");
    expect(
      validateCrewSessionDraft("Run", "2026-10-24", "08:00", 30, now),
    ).toBe("2026-10-24T12:00:00.000Z");
  });
  it("creates once, joins once, leaves and cancels without logging workouts", () => {
    vi.spyOn(Date, "now").mockReturnValue(now.getTime());
    let rows = demoCrewSessionMutation([], draft, "a", "running");
    rows = demoCrewSessionMutation(rows, draft, "a", "running");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe("Easy run");
    rows = demoCrewSessionMutation(
      rows,
      { action: "rsvp", id: "session", join: true },
      "b",
      "running",
    );
    rows = demoCrewSessionMutation(
      rows,
      { action: "rsvp", id: "session", join: true },
      "b",
      "running",
    );
    expect(rows[0]!.participants).toHaveLength(2);
    rows = demoCrewSessionMutation(
      rows,
      { action: "rsvp", id: "session", join: false },
      "b",
      "running",
    );
    expect(rows[0]!.participants).toHaveLength(1);
    expect(
      demoCrewSessionMutation(
        rows,
        { action: "cancel", id: "session" },
        "b",
        "running",
      )[0]!.cancelled_at,
    ).toBeNull();
    rows = demoCrewSessionMutation(
      rows,
      { action: "cancel", id: "session" },
      "a",
      "running",
    );
    expect(rows[0]!.cancelled_at).toBeTruthy();
    expect(
      demoCrewSessionMutation(
        rows,
        { action: "rsvp", id: "session", join: true },
        "b",
        "running",
      )[0]!.participants,
    ).toHaveLength(1);
    vi.restoreAllMocks();
  });
});
