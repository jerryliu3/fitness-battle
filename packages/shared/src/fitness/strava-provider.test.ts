import { describe, expect, it } from "vitest";
import {
  createStravaProvider,
  mapSportToCategory,
  mapStravaActivity,
} from "./strava-provider";

describe("strava provider", () => {
  it("maps sports to categories", () => {
    expect(mapSportToCategory("Ride")).toBe("cycling");
    expect(mapSportToCategory("Walk")).toBe("walking");
    expect(mapSportToCategory("WeightTraining")).toBe("strength");
    expect(mapSportToCategory("Workout")).toBe("strength");
    expect(mapSportToCategory("Run")).toBe("running");
    expect(mapSportToCategory("Swim")).toBeNull();
    expect(mapSportToCategory("Yoga")).toBeNull();
  });

  it("maps raw activities to samples", () => {
    const sample = mapStravaActivity({
      id: 42,
      name: "Tempo",
      sport_type: "Run",
      start_date: "2026-10-01T12:00:00Z",
      distance: 5000,
      moving_time: 1500,
    });
    expect(sample).not.toBeNull();
    expect(sample?.provider).toBe("strava");
    expect(sample?.externalId).toBe("42");
    expect(sample?.categorySlug).toBe("running");
    expect(sample?.metricValue).toBe(5000);
    expect(sample?.movingSec).toBe(1500);
    expect(mapStravaActivity({
      id: 9,
      name: "Pool",
      sport_type: "Swim",
      start_date: "2026-10-01T12:00:00Z",
      distance: 1500,
      moving_time: 1800,
    })).toBeNull();
  });

  it("connects as stub without credentials", async () => {
    const provider = createStravaProvider({});
    const result = await provider.connect("user-1");
    expect(result.status).toBe("stub");
    expect(result.authorizeUrl).toBeUndefined();
    const sync = await provider.syncActivities("user-1");
    expect(sync.usedMock).toBe(true);
    expect(sync.activities.length).toBeGreaterThan(0);
  });

  it("exchanges tokens and pulls activities when credentials exist", async () => {
    const calls: string[] = [];
    const http = {
      fetch: async (input: string | URL, _init?: RequestInit) => {
        const url = String(input);
        calls.push(url);
        if (url.includes("/oauth/token")) {
          return new Response(
            JSON.stringify({
              access_token: "access",
              refresh_token: "refresh",
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              athlete: { id: 9 },
            }),
            { status: 200 },
          );
        }
        if (url.includes("/athlete/activities")) {
          return new Response(
            JSON.stringify([
              {
                id: 7,
                name: "Easy",
                sport_type: "Run",
                start_date: "2026-10-01T10:00:00Z",
                distance: 4000,
                moving_time: 1200,
              },
            ]),
            { status: 200 },
          );
        }
        return new Response("not found", { status: 404 });
      },
    };

    const provider = createStravaProvider(
      {
        clientId: "id",
        clientSecret: "secret",
        redirectUri: "http://localhost/callback",
      },
      { http },
    );

    const auth = await provider.connect("user-2");
    expect(auth.authorizeUrl).toContain("strava.com/oauth/authorize");

    const completed = await provider.completeOAuth("user-2", "code-1");
    expect(completed.status).toBe("connected");

    const sync = await provider.syncActivities("user-2", {
      since: "2026-09-01T00:00:00.000Z",
    });
    expect(sync.usedMock).toBe(false);
    expect(sync.activities).toHaveLength(1);
    expect(calls.some((url) => url.includes("/oauth/token"))).toBe(true);
    expect(calls.some((url) => url.includes("/athlete/activities"))).toBe(true);
  });
});
