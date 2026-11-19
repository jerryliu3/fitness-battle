import { describe, expect, it } from "vitest";
import { freshState } from "./compete/engine";
import {
  SPECIAL_EVENT_PRESETS,
  buildSpecialEventPreset,
  extractCrewOptions,
  formatSpecialEventVolume,
  nextSpecialEventWindow,
  specialEventError,
  specialEventFormatLabel,
  specialEventPhase,
  specialEventRegistrationDetail,
  specialEventRoundLabel,
  specialEventStatusBadge,
  validateSpecialEventConfig,
  validateSpecialEventEditionInput,
  type SpecialEventEdition,
} from "./special-events";

describe("special events scheduling & presets", () => {
  it("computes next full-week window opening Mon 00:00 ET prior and locking next Mon 06:00 ET", () => {
    const win = nextSpecialEventWindow(new Date("2026-11-18T20:00:00.000Z"), 1);
    expect(win.registrationOpensAt.toISOString()).toBe("2026-11-16T05:00:00.000Z");
    expect(win.startsAt.toISOString()).toBe("2026-11-23T11:00:00.000Z");
    expect(win.registrationClosesAt.toISOString()).toBe(win.startsAt.toISOString());
    expect(win.endsAt.toISOString()).toBe("2026-11-30T05:00:00.000Z");
  });

  it("handles DST transition cleanly for Mon 06:00 EDT/EST", () => {
    const win = nextSpecialEventWindow(new Date("2026-10-28T16:00:00.000Z"), 1);
    expect(win.startsAt.toISOString()).toBe("2026-11-02T11:00:00.000Z");
    expect(win.endsAt.toISOString()).toBe("2026-11-09T05:00:00.000Z");
  });

  it("validates every preset and rejects solo relay or late cutoffs", () => {
    const now = new Date("2026-11-18T20:00:00.000Z");
    for (const preset of SPECIAL_EVENT_PRESETS) {
      const built = buildSpecialEventPreset(preset.id, "running", now);
      expect(validateSpecialEventEditionInput({ ...built, id: null }).slug).toBe(built.slug);
    }
    expect(() =>
      validateSpecialEventConfig({
        version: 1,
        grouping: { kind: "solo" },
        match: { kind: "single_round", targetHeatSize: 8, minHeatSize: 2 },
        cadence: { unit: "single_week", roundCount: 1, scoreMode: "round_window" },
        scoring: { mode: "relay_handoff", legsPerDay: 1, assignmentMode: "manual", lockPolicy: "full_week", maxLegsPerMember: 4 },
        divisionMode: "none",
      }),
    ).toThrow(/Relay scoring requires team or crew grouping/);

    const draft = buildSpecialEventPreset("daily_survivor", "running", now);
    expect(() =>
      validateSpecialEventEditionInput({
        ...draft, id: null,
        registrationClosesAt: new Date(Date.parse(draft.startsAt) + 3_600_000).toISOString(),
      }),
    ).toThrow(/registration open < close <= start < end/);
  });
});

describe("special events presentation", () => {
  const draft = buildSpecialEventPreset("country_squads_3v3", "running", new Date("2026-11-18T20:00:00.000Z"));
  const edition: SpecialEventEdition = {
    id: "00000000-0000-4000-8000-000000000001",
    ...draft,
    rulesVersion: 1,
    finalizedAt: null,
    settledAt: null,
    entrantCount: 14,
    entry: null,
    receipts: [],
  };

  it("derives registering, locked gap, active, and spectator phases cleanly", () => {
    const state = freshState();
    const duringReg = new Date("2026-11-19T16:00:00.000Z");
    expect(specialEventPhase(edition, duringReg)).toBe("registering");
    expect(specialEventStatusBadge(edition, duringReg)).toBe("Open now");
    expect(specialEventFormatLabel(edition.config)).toBe("Country 3v3");
    expect(specialEventRegistrationDetail(state, edition, duringReg).canRegister).toBe(true);

    const earlyClose = { ...edition, registrationClosesAt: "2026-11-23T05:00:00.000Z" };
    expect(specialEventPhase(earlyClose, new Date("2026-11-23T08:00:00.000Z"))).toBe("locked");
    expect(specialEventRegistrationDetail(state, earlyClose, new Date("2026-11-23T08:00:00.000Z")).canRegister).toBe(false);

    const spectating: SpecialEventEdition = {
      ...edition,
      entry: {
        id: "e1", status: "spectating", sideId: null, sideName: null, spectateHeatId: "h1",
        requestedCrewId: null, groupSnapshot: { country_code: "US" }, entryRating: 1100,
        registeredAt: "2026-11-18T21:00:00.000Z", eliminatedRound: null, finalPlace: null, finalScore: null, acknowledgedAt: null,
      },
    };
    expect(specialEventStatusBadge(spectating, new Date("2026-11-24T16:00:00.000Z"))).toBe("Watching live");
    expect(extractCrewOptions([{ crews: { id: "c1", name: "Track Club" } }, { crews: [{ id: "c2", name: "Dawn" }] }])).toEqual([
      { id: "c1", name: "Track Club" },
      { id: "c2", name: "Dawn" },
    ]);
    expect(specialEventError("registration_closed")).toMatch(/full-week/);
    expect(specialEventError("edition_not_started")).toMatch(/starts/i);
    const survivorCfg = buildSpecialEventPreset("daily_survivor", "running").config;
    expect(specialEventRoundLabel(survivorCfg, 1, 4)).toBe("Day 1");
    expect(specialEventRoundLabel(survivorCfg, 4, 4)).toBe("Day 4 · Final");
    const koCfg = buildSpecialEventPreset("weekly_knockout_1v1", "running").config;
    expect(specialEventRoundLabel(koCfg, 1, 3)).toBe("Quarterfinals");
    expect(specialEventRoundLabel(koCfg, 2, 3)).toBe("Semifinals");
    expect(specialEventRoundLabel(koCfg, 3, 3)).toBe("Final");
    expect(formatSpecialEventVolume("running", 1609.344, "us")).toBe("1 mi");
  });
});
