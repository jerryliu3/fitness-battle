import { afterEach, describe, expect, it } from "vitest";
import {
  resolveOAuthCallbackUserId,
  signOAuthState,
  verifyOAuthState,
  withSignedOAuthState,
} from "./oauth-state";

describe("oauth-state", () => {
  const prev = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    if (prev === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prev;
  });

  it("round-trips a signed state for the matching provider", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    const state = signOAuthState("user-1", "oura", 1_000_000);
    expect(verifyOAuthState(state, "oura", 1_000_100)).toBe("user-1");
    expect(verifyOAuthState(state, "strava", 1_000_100)).toBeNull();
  });

  it("rejects expired state", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    const state = signOAuthState("user-1", "strava", 1_000_000);
    expect(verifyOAuthState(state, "strava", 1_000_000 + 16 * 60 * 1000)).toBeNull();
  });

  it("rewrites authorizeUrl state", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    const next = withSignedOAuthState(
      "https://example.com/oauth?client_id=1&state=user-1",
      "user-1",
      "whoop",
    );
    expect(next).toBeTruthy();
    const url = new URL(next!);
    expect(url.searchParams.get("state")).not.toBe("user-1");
    expect(verifyOAuthState(url.searchParams.get("state")!, "whoop")).toBe("user-1");
  });

  it("leaves Garmin-style URLs without state alone", () => {
    const raw = "https://connect.garmin.com/oauthConfirm?oauth_token=abc";
    expect(withSignedOAuthState(raw, "user-1", "garmin")).toBe(raw);
  });

  it("accepts signed state without a session cookie", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    const state = signOAuthState("user-9", "strava");
    await expect(
      resolveOAuthCallbackUserId({
        state,
        provider: "strava",
        sessionUserId: null,
      }),
    ).resolves.toBe("user-9");
  });

  it("falls back to session + raw user id state", async () => {
    await expect(
      resolveOAuthCallbackUserId({
        state: "user-raw",
        provider: "strava",
        sessionUserId: "user-raw",
      }),
    ).resolves.toBe("user-raw");
    await expect(
      resolveOAuthCallbackUserId({
        state: "user-raw",
        provider: "strava",
        sessionUserId: null,
      }),
    ).resolves.toBeNull();
  });
});
