import { describe, expect, it } from "vitest";
import { cityLabel, filterCities, inferCitySlug } from "./cities";
import { freshState } from "./compete/engine";
import {
  SPECIAL_EVENT_PRESETS,
  buildSpecialEventPreset,
  extractCrewOptions,
  findCrewRelayEdition,
  formatSpecialEventVolume,
  nextSpecialEventWindow,
  relayDayLabel,
  relayDaysBetween,
  relayDraftToLegs,
  specialEventError,
  specialEventFormatLabel,
  specialEventPhase,
  specialEventPendingCeremony,
  specialEventRegistrationDetail,
  specialEventRoundLabel,
  specialEventSceneLanes,
  specialEventSideCode,
  specialEventSideLabel,
  specialEventStatusBadge,
  specialEventStatusHero,
  sortSpecialEvents,
  validateSpecialEventConfig,
  validateSpecialEventEditionInput,
  validateSpecialEventTemplateInput,
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
    expect(relayDaysBetween("2026-11-23", "2026-11-29")).toHaveLength(7);
    expect(relayDayLabel("2026-11-23")).toMatch(/Mon.*23/);
    expect(specialEventError("relay_lineup_locked")).toMatch(/locked/i);
    expect(specialEventSideLabel({ displayName: "US", groupAttr: "country_code", groupValue: "US" })).toMatch(/United States$/);
    expect(specialEventSideLabel({ displayName: "US #1", groupAttr: "country_code", groupValue: "US" })).toContain("United States #1");
    expect(specialEventSideLabel({ displayName: "us:new-york #2", groupAttr: "city_slug", groupValue: "us:new-york" })).toContain("New York #2");
    expect(specialEventSideLabel({ displayName: "Track Club", groupAttr: null, groupValue: null })).toBe("Track Club");

    expect(filterCities("nyc")[0]?.slug).toBe("us:new-york");
    expect(inferCitySlug("Brooklyn, NY", "US")).toBe("us:new-york");
    expect(cityLabel("us:boulder")).toContain("Boulder");
    expect(specialEventError("city_required")).toMatch(/city/i);

    const cityDraft = buildSpecialEventPreset("city_squads_3v3", "running", new Date("2026-11-18T20:00:00.000Z"));
    expect(specialEventFormatLabel(cityDraft.config)).toBe("City 3v3");
    const tpl = validateSpecialEventTemplateInput({
      id: null, seriesKey: cityDraft.seriesKey, sport: cityDraft.sport,
      title: cityDraft.title, subtitle: cityDraft.subtitle, config: cityDraft.config,
      cadenceWeeks: 2, active: true, nextStartAt: cityDraft.startsAt,
    });
    expect(tpl.cadenceWeeks).toBe(2);
    expect(() => validateSpecialEventTemplateInput({ ...tpl, cadenceWeeks: 12 })).toThrow(/Cadence weeks/);

    const runRelay: SpecialEventEdition = { ...edition, id: "r1", sport: "running", config: buildSpecialEventPreset("crew_relay_locked", "running").config };
    expect(findCrewRelayEdition([runRelay], "c1", "cycling", duringReg)).toBeNull();
    expect(findCrewRelayEdition([runRelay], "c1", "running", duringReg)?.id).toBe("r1");
    expect(relayDraftToLegs({ "2026-11-23:1": "u1", "2026-11-24:1": "u2" }, "2026-11-23")).toEqual([
      { legDay: "2026-11-24", slotIndex: 1, userId: "u2" },
    ]);
    expect(sortSpecialEvents([edition, spectating]).map((e) => e.id)).toEqual([spectating.id, edition.id]);

    expect(specialEventSideCode({ displayName: "us:new-york #1", groupAttr: "city_slug", groupValue: "us:new-york" })).toBe("NY");
    expect(specialEventSideCode({ displayName: "Weekday miles", groupAttr: null, groupValue: null })).toBe("WM");
    const sampleStandings = {
      editionId: edition.id,
      sport: "running" as const,
      finalizedAt: "2026-11-23T11:00:00Z",
      settledAt: null,
      currentRound: 1,
      mySideId: "s2",
      myStatus: "active" as const,
      rounds: [{
        roundNumber: 1,
        startsAt: "2026-11-23T11:00:00Z",
        endsAt: "2026-11-24T05:00:00Z",
        advanceCount: 2,
        scoreMode: "round_window" as const,
        finalizedAt: "2026-11-23T11:00:00Z",
        settledAt: null,
        heats: [{
          id: "h1",
          divisionKey: "div_1",
          heatIndex: 1,
          isMine: true,
          advanceCount: 2,
          sides: [
            { sideId: "s1", displayName: "Carla", userId: "u1", isYou: false, score: 6437.376, place: 1, advancing: true },
            { sideId: "s2", displayName: "You", userId: "u2", isYou: true, score: 4828.032, place: 2, advancing: true },
            { sideId: "s3", displayName: "Dana", userId: "u3", isYou: false, score: 3218.688, place: 3, advancing: false },
          ],
        }],
      }],
    };
    const lanes = specialEventSceneLanes(sampleStandings, "us");
    expect(lanes.map((l) => [l.id, Math.round(l.value), l.you])).toEqual([["s1", 4, false], ["s2", 3, true], ["s3", 2, false]]);
    const survivorEd = { ...edition, config: survivorCfg };
    const hero = specialEventStatusHero(sampleStandings, survivorEd, "us");
    expect(hero?.badge).toBe("ABOVE CUT LINE");
    expect(hero?.tone).toBe("lime");
    expect(hero?.headline).toContain("+1 mi");

    const settledStandings = {
      ...sampleStandings,
      rounds: [{
        ...sampleStandings.rounds[0]!,
        settledAt: "2026-11-24T05:00:00Z",
        heats: [{
          ...sampleStandings.rounds[0]!.heats[0]!,
          sides: [
            { sideId: "s1", displayName: "Carla", userId: "u1", isYou: false, score: 6437.376, place: 1, advancing: true },
            { sideId: "s2", displayName: "You", userId: "u2", isYou: true, score: 4828.032, place: 2, advancing: true },
            { sideId: "s3", displayName: "Dana", userId: "u3", isYou: false, score: 3218.688, place: 3, advancing: false },
          ],
        }],
      }, { ...sampleStandings.rounds[0]!, roundNumber: 2, settledAt: null }],
    };
    const ceremony = specialEventPendingCeremony(settledStandings, { ...survivorEd, entry: { ...spectating.entry!, status: "active", acknowledgedRound: 0 } }, "us");
    expect(ceremony?.headline).toBe("YOU SURVIVED");
    expect(ceremony?.roundNumber).toBe(1);
    expect(specialEventPendingCeremony(settledStandings, { ...survivorEd, entry: { ...spectating.entry!, status: "active", acknowledgedRound: 1 } }, "us")).toBeNull();
  });
});
