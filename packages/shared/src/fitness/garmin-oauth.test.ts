import { describe, expect, it, vi } from "vitest";
import { mapGarminActivity, createGarminProvider } from "./garmin-provider";
import type { StravaStore, StravaTokenSet } from "./strava-provider";
import { activityFromSample } from "./samples";
import type { FitnessConnection } from "../types";

describe("Garmin OAuth 2", () => {
  it("exchanges PKCE, refreshes a rotating token and revokes on disconnect", async () => {
    let tokens: StravaTokenSet | null = null;
    let connection: FitnessConnection | null = null;
    const store: StravaStore = {
      getTokens: async () => tokens, setTokens: async (_, value) => { tokens = value; }, deleteTokens: async () => { tokens = null; },
      getConnection: async () => connection, setConnection: async value => { connection = value; }, deleteConnection: async () => { connection = null; },
    };
    const fetcher = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("oauth/token")) {
        const fields = new URLSearchParams(String(init?.body));
        if (fields.get("grant_type") === "authorization_code") {
          expect(fields.get("code_verifier")).toBe("verifier");
          return Response.json({ access_token: "first", refresh_token: "refresh", expires_in: 1 });
        }
        expect(fields.get("refresh_token")).toBe("refresh");
        return Response.json({ access_token: "second", refresh_token: "rotated", expires_in: 86400 });
      }
      if (url.endsWith("/user/id")) return Response.json({ userId: "garmin-user" });
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer second");
      return new Response(null, { status: 204 });
    });
    const provider = createGarminProvider({ consumerKey: "id", consumerSecret: "secret", redirectUri: "https://example.com/callback" }, { store, http: { fetch: fetcher } });
    const start = await provider.connect("user");
    expect(new URL(start.authorizeUrl!).pathname).toBe("/oauth2Confirm");
    await provider.completeOAuth("user", "code", "verifier");
    expect((await store.getTokens("user"))?.athleteId).toBe("garmin-user");
    await provider.disconnect("user");
    expect(await store.getTokens("user")).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});


describe("Garmin GPS evidence", () => {
  const summary = { activityType: "RUNNING", activityId: "1", startTimeInSeconds: 1700000000, durationInSeconds: 600, distanceInMeters: 2000 };
  it("does not mistake an indoor session, manual entry or unknown summary for GPS", () => {
    expect(mapGarminActivity(summary)?.verified).toBe(false);
    expect(mapGarminActivity({ ...summary, activityName: "Treadmill Running", startingLatitudeInDegree: 40, startingLongitudeInDegree: -74 })?.verified).toBe(false);
    expect(activityFromSample(mapGarminActivity(summary)!)?.verified).toBe(false);
    for (const activityType of ["TREADMILL_RUNNING", "INDOOR_CYCLING", "VIRTUAL_RUN"]) {
      expect(mapGarminActivity({ ...summary, activityType, startingLatitudeInDegree: 40, startingLongitudeInDegree: -74 })?.verified).toBe(false);
    }
    expect(mapGarminActivity({ ...summary, manual: true, startingLatitudeInDegree: 40, startingLongitudeInDegree: -74 })?.verified).toBe(false);
  });
  it("uses valid GPS evidence without inventing a route from a single location", () => {
    const activity = mapGarminActivity({ ...summary, startingLatitudeInDegree: 40, startingLongitudeInDegree: -74 });
    expect(activity?.verified).toBe(true);
    expect(activity?.summaryPolyline).toBeUndefined();
    expect(mapGarminActivity({ ...summary, startingLatitudeInDegree: 0, startingLongitudeInDegree: 0 })?.verified).toBe(false);
    expect(mapGarminActivity({ ...summary, startingLatitudeInDegree: 95, startingLongitudeInDegree: -74 })?.verified).toBe(false);
  });
  it("retains supplied route samples for map and replay, with no route on indoor sessions", () => {
    const samples = [0, 1, 2].map(i => ({ latitudeInDegree: 40 + i * .001, longitudeInDegree: -74, startTimeInSeconds: 1700000000 + i * 10, heartRate: 140 + i }));
    const activity = mapGarminActivity({ ...summary, samples });
    expect(activity?.verified).toBe(true);
    expect(activity?.summaryPolyline).toBeTruthy();
    expect(activity?.detailedPolyline).toBeTruthy();
    expect(activity?.routeBounds).toEqual([-74, 40, -74, 40.002]);
    expect(activity?.routeReplay).toHaveLength(3);
    expect(mapGarminActivity({ ...summary, activityType: "TREADMILL_RUNNING", samples })?.summaryPolyline).toBeUndefined();
  });
});

it("authenticates a single-use activity file with OAuth 2 and refuses other callback hosts", async () => {
  const http = { fetch: vi.fn(async () => new Response("file")) };
  const store = { getTokens: async () => ({ accessToken: "access", refreshToken: "refresh", expiresAt: Math.floor(Date.now()/1000)+86400 }) } as unknown as StravaStore;
  const provider = createGarminProvider({}, { store, http });
  const url = "https://apis.garmin.com/wellness-api/rest/activityFile?id=1&token=single-use";
  await provider.downloadActivityFile("owner", url);
  expect(http.fetch).toHaveBeenCalledWith(url, expect.objectContaining({ redirect: "error", headers: { Authorization: "Bearer access" } }));
  await expect(provider.downloadActivityFile("owner", "https://example.com/file")).rejects.toThrow("garmin_callback_rejected");
  expect(http.fetch).toHaveBeenCalledTimes(1);
});
