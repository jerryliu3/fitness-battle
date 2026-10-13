import { describe, expect, it } from "vitest";
import {
  freshState,
  migrateCompeteState,
  reduceCompete,
  rollClock,
} from "./engine";
import {
  buildSleepView,
  collapseNights,
  demoSleepNight,
  scoreSleepNight,
  sleepContest,
} from "./health";

describe("sleep health metric", () => {
  it("keeps a device score and blends raw stages when one is missing", () => {
    expect(scoreSleepNight({ durationMin: 400, deviceScore: 84 })).toBe(84);
    const blended = scoreSleepNight({
      durationMin: 480,
      efficiency: 90,
      deepMin: 90,
      remMin: 110,
    });
    expect(blended).toBeGreaterThan(70);
    expect(blended).toBeLessThanOrEqual(100);
  });

  it("collapses two readings of the same night to the verified one", () => {
    const manual = { ...demoSleepNight("manual", "2026-10-12"), score: 99, verified: false };
    const oura = { ...demoSleepNight("oura", "2026-10-12"), score: 80, verified: true };
    const kept = collapseNights([manual, oura]);
    expect(kept).toHaveLength(1);
    expect(kept[0]?.source).toBe("oura");
  });

  it("lowers the week score when nights are missing", () => {
    const start = new Date("2026-10-12T00:00:00.000Z");
    const end = new Date("2026-10-19T00:00:00.000Z");
    const asOf = new Date("2026-10-15T12:00:00.000Z");
    const night = demoSleepNight("oura", "2026-10-12");
    night.score = 80;
    const full = sleepContest(
      ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"].map((day) => ({
        ...night,
        id: `n-${day}`,
        day,
      })),
      start,
      end,
      asOf,
    );
    const sparse = sleepContest([night], start, end, asOf);
    expect(full.score).toBeGreaterThan(sparse.score);
    expect(sparse.nights).toBe(1);
    expect(sparse.elapsed).toBe(4);
  });

  it("stores a tracker night on demo sync and shows last night", () => {
    const now = "2026-10-13T15:00:00.000Z";
    const linked = reduceCompete(freshState(new Date(now)), {
      type: "link",
      provider: "oura",
      now,
    });
    const synced = reduceCompete(linked, { type: "sync", provider: "oura", now });
    expect(synced.sleepNights.some((night) => night.source === "oura")).toBe(true);
    expect(synced.readiness.some((mark) => mark.provider === "oura")).toBe(true);

    const joined = reduceCompete(synced, { type: "opt-in-health", metric: "sleep", now });
    const view = buildSleepView({
      name: joined.name,
      nights: joined.sleepNights,
      rating: joined.healthRatings.find((item) => item.metric === "sleep")!,
      results: joined.healthResults,
      now: new Date(now),
    });
    expect(view.lastNight?.day).toBe("2026-10-13");
    expect(view.place).toBeGreaterThan(0);
    expect(view.fieldSize).toBe(8);
    expect(joined.focus).toEqual({ family: "health", id: "sleep" });
  });

  it("settles a closed sleep week into rating history", () => {
    const monday = "2026-10-12T12:00:00.000Z";
    const joined = reduceCompete(freshState(new Date(monday)), {
      type: "opt-in-health",
      now: monday,
    });
    const logged = reduceCompete(joined, {
      type: "log-sleep",
      score: 88,
      durationMin: 450,
      now: monday,
    });
    const closed = rollClock(logged, new Date("2026-10-19T00:00:00.000Z"));
    const rating = closed.healthRatings.find((item) => item.metric === "sleep");
    expect(closed.healthResults).toHaveLength(1);
    expect(closed.healthResults[0]?.place).toBeGreaterThan(0);
    expect(rating?.optedIn).toBe(true);
    expect(rating?.lockPeriod).toBe("2026-10-18T00:00:00.000Z");
    expect(rating?.elo).not.toBe(logged.healthRatings[0]?.elo);
  });

  it("migrates older saves without dropping the running focus", () => {
    const legacy = freshState();
    const stripped = { ...legacy } as typeof legacy;
    delete (stripped as { focus?: unknown }).focus;
    delete (stripped as { sleepNights?: unknown }).sleepNights;
    const migrated = migrateCompeteState(stripped);
    expect(migrated.focus).toEqual({ family: "sport", id: "running" });
    expect(migrated.sleepNights).toEqual([]);
    expect(migrated.healthRatings.map((item) => item.metric)).toEqual(["sleep"]);
  });
});
