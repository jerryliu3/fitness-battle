import { expect, it } from "vitest";
import { freshState, reduceCompete, rollClock, withAccountEloBaseline } from "@fitness-battle/shared";
import { applyCompetitionActivityIntents, deriveCompetitionIntents } from "./competition-intents";
const now = new Date("2026-10-28T15:00:00Z");
function baseline() { return withAccountEloBaseline(freshState(now)); }
it("ignores forged ratings, archived results, milestone awards and freeze budgets", () => {
  const stored = baseline();
  const forged: typeof stored = { ...stored, name: "Allowed name", freezesLeft: 900,
    ratings: stored.ratings.map(r => ({ ...r, openElo: 2400, verifiedElo: 2400 })),
    periodResults: [{ id: "forged", sport: "running", eloAfter: 2400 }] as typeof stored.periodResults,
    effortScoreEvents: [{ id: "forged", sport: "running", track: "open", occurredAt: now.toISOString(), scoreBefore: 1000, scoreAfter: 2400 }],
    effortMilestones: [{ sport: "running", earned: 999 }] as typeof stored.effortMilestones,
  };
  const result = deriveCompetitionIntents(stored, forged, "owner", now);
  expect(result.ratings).toEqual(stored.ratings);
  expect(result.periodResults).toEqual([]);
  expect(result.effortMilestones).toEqual(stored.effortMilestones);
  expect(result.effortScoreEvents).toEqual(stored.effortScoreEvents);
  expect(result.freezesLeft).toBe(3);
  expect(result.name).toBe("Allowed name");
});
it("derives a registration benchmark from the server clock and score", () => {
  const stored = baseline();
  const incoming = reduceCompete(stored, { type: "opt-in", sport: "running", now: "2026-10-28T09:00Z" });
  incoming.ratings = incoming.ratings.map(r => ({ ...r, openElo: 2400, lockOpen: 2400 }));
  const result = deriveCompetitionIntents(stored, incoming, "owner", now);
  expect(result.enrollments[0]!.waveStart).toBe("2026-10-29T10:00:00.000Z");
  expect(result.ratings.find(r => r.sport === "running")!.lockOpen).toBe(1000);
});
it("keeps stored tracker facts and treats new manual activity as Open only", () => {
  const stored = baseline();
  stored.activities = [{ id: "strava-original", sport: "running", startedAt: now.toISOString(), distanceM: 5000, movingSec: 1800, avgHr: 150, verified: true, provenance: "recorded", disposition: "counted", source: "strava" }];
  const incoming = { ...stored, activities: [{ ...stored.activities[0]!, distanceM: 500000, disposition: "excluded" as const },
    { ...stored.activities[0]!, id: "manual-new", source: "manual" as const, provenance: "manual" as const },
    { ...stored.activities[0]!, id: "strava-forged" }] };
  const result = deriveCompetitionIntents(stored, incoming, "owner", now);
  expect(result.activities[0]).toMatchObject({ distanceM: 5000, disposition: "excluded" });
  expect(result.activities.find(a => a.id === "manual-new")).toMatchObject({ verified: false, avgHr: null });
  expect(result.activities.some(a => a.id === "strava-forged")).toBe(false);
});

it("excludes reviewed ingest before settlement awards milestones, including on retry", () => {
  const enrolled = reduceCompete(baseline(), { type: "opt-in", sport: "running", now: "2026-10-28T09:00:00Z" });
  const stored = { ...enrolled, activities: [{ id: "apple_health-import", sport: "running" as const,
    startedAt: "2026-10-28T12:00:00Z", distanceM: 20000, movingSec: 3600, avgHr: null,
    source: "apple_health" as const, verified: true, provenance: "recorded" as const, disposition: "counted" as const }] };
  const incoming = { ...stored, activities: stored.activities.map(a => ({ ...a, disposition: "excluded" as const })) };
  // Reproduce the old ordering: settlement minted awards that the final document cannot justify.
  const broken = deriveCompetitionIntents(rollClock(stored, now), incoming, "owner", now);
  expect(broken.effortMilestones!.some(r => r.earned > 0)).toBe(true);
  for (let retry = 0; retry < 2; retry++) {
    const reviewed = applyCompetitionActivityIntents(stored, incoming, now);
    const result = deriveCompetitionIntents(rollClock(reviewed, now), incoming, "owner", now);
    expect(result.effortMilestones!.every(r => r.earned === 0)).toBe(true);
    expect(result.ratings).toEqual(enrolled.ratings);
    expect(result.activities[0]!.disposition).toBe("excluded");
  }
});

it("preserves committed high-water awards when a previously counted activity is excluded", () => {
  const enrolled = reduceCompete(baseline(), { type: "opt-in", sport: "running", now: "2026-10-28T09:00:00Z" });
  const stored = rollClock({ ...enrolled, activities: [{ id: "strava-counted", sport: "running" as const,
    startedAt: "2026-10-28T12:00:00Z", distanceM: 20000, movingSec: 3600, avgHr: null,
    source: "strava" as const, verified: true, provenance: "recorded" as const, disposition: "counted" as const }] }, now);
  const incoming = { ...stored, activities: stored.activities.map(a => ({ ...a, disposition: "excluded" as const })) };
  const result = deriveCompetitionIntents(rollClock(applyCompetitionActivityIntents(stored, incoming, now), now), incoming, "owner", now);
  expect(result.effortMilestones).toEqual(stored.effortMilestones);
  expect(result.ratings).toEqual(stored.ratings);
});
