import { describe, expect, it } from "vitest";
import { freshState, reduceCompete } from "./compete/engine";
import {
  buildHomeDeck,
  buildHomeRouteWeek,
  homeDeckDismissStorageKey,
  parseDismissedCardIds,
  serializeDismissedCardIds,
  shouldSwipeDismiss,
  visibleHomeDeckCards,
} from "./home-deck";

describe("home-deck shared model", () => {
  it("builds a 7-stop Monday–Sunday horizontal route week with logged, today, missed, and future states", () => {
    // Thursday, Oct 22, 2026 14:00 UTC (10:00 AM EDT)
    const now = new Date("2026-10-22T14:00:00.000Z");
    const state = freshState(now);
    state.primary = "running";
    state.units = "metric";
    state.activities = [
      {
        id: "mon-run",
        sport: "running",
        startedAt: "2026-10-19T12:00:00.000Z", // Mon
        distanceM: 5200,
        movingSec: 1680,
        avgHr: 142,
        verified: true,
        source: "strava",
        provenance: "recorded",
        disposition: "counted",
      },
      {
        id: "wed-run",
        sport: "running",
        startedAt: "2026-10-21T12:00:00.000Z", // Wed
        distanceM: 6400,
        movingSec: 2100,
        avgHr: 146,
        verified: true,
        source: "strava",
        provenance: "recorded",
        disposition: "counted",
      },
    ];

    const route = buildHomeRouteWeek(state, now);
    expect(route.stops).toHaveLength(7);
    expect(route.todayIndex).toBe(3); // Thursday = index 3 (Mon=0)
    expect(route.stops.map((s) => s.weekdayShort)).toEqual([
      "MON",
      "TUE",
      "WED",
      "THU",
      "FRI",
      "SAT",
      "SUN",
    ]);
    expect(route.stops.map((s) => s.status)).toEqual([
      "logged",
      "missed",
      "logged",
      "today-open",
      "future",
      "future",
      "future",
    ]);
    expect(route.stops[0]?.volumeLabel).toBe("5.2 km");
    expect(route.stops[2]?.volumeLabel).toBe("6.4 km");
    expect(route.headline).toBe("Good things are in motion.");
    expect(route.subtitle).toContain("2 sessions logged across 2 days");
  });

  it("orders the 4 swipeable deck cards and updates session & insight copy when today is logged", () => {
    const now = new Date("2026-10-22T14:00:00.000Z");
    let state = reduceCompete(freshState(now), {
      type: "opt-in",
      sport: "running",
    });
    state = {
      ...state,
      units: "metric",
      activities: [
        {
          id: "thu-run",
          sport: "running",
          startedAt: "2026-10-22T11:30:00.000Z",
          distanceM: 7500,
          movingSec: 2400,
          avgHr: 148,
          verified: true,
          source: "strava",
          provenance: "recorded",
          disposition: "counted",
        },
      ],
      dailyHealth: [
        ...Array.from({ length: 10 }, (_, i) => ({
          day: `2026-10-${String(10 + i).padStart(2, "0")}`,
          provider: "apple_health" as const,
          restingHr: 54,
          steps: 9000,
        })),
        {
          day: "2026-10-21",
          provider: "apple_health" as const,
          restingHr: 64,
          steps: 5000,
        },
        {
          day: "2026-10-22",
          provider: "apple_health" as const,
          restingHr: 54,
          steps: 9200,
        },
      ],
    };

    const cards = buildHomeDeck(state, { now });
    expect(cards.map((c) => c.id)).toEqual(["session", "compete", "route", "insight"]);
    expect(cards[0]?.badge).toBe("COMPLETED TODAY");
    expect(cards[0]?.title).toContain("7.5 km logged today");
    expect(cards[1]?.action).toEqual({ type: "navigate", href: "/arena?event=running" });
    expect(cards[2]?.routeWeek?.stops[3]?.status).toBe("today-logged");
    expect(cards[3]?.badge).toBe("STEADY SIGNALS");
    expect(cards[3]?.title).toBe("Body signals look steady.");
  });

  it("handles dismissal persistence helpers and horizontal swipe threshold", () => {
    const now = new Date("2026-10-22T14:00:00.000Z");
    const key = homeDeckDismissStorageKey("alice", now);
    expect(key).toBe("fb:home-deck-dismissed:v1:alice:2026-10-22");

    const raw = serializeDismissedCardIds(["session", "compete", "session"]);
    expect(parseDismissedCardIds(raw)).toEqual(["session", "compete"]);
    expect(parseDismissedCardIds("invalid-json")).toEqual([]);

    const cards = buildHomeDeck(freshState(now), { now });
    expect(visibleHomeDeckCards(cards, ["session", "route"]).map((c) => c.id)).toEqual([
      "compete",
      "insight",
    ]);

    expect(shouldSwipeDismiss(-80, 12)).toBe("left");
    expect(shouldSwipeDismiss(75, 10)).toBe("right");
    expect(shouldSwipeDismiss(-30, 5)).toBeNull();
    expect(shouldSwipeDismiss(-80, 90)).toBeNull();
  });
});
