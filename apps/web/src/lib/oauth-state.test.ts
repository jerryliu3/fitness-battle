import { afterEach, describe, expect, it } from "vitest";
import {
  resolveOAuthCallbackUserId,
  signOAuthState,
  verifyOAuthState,
  withSignedOAuthState,
} from "./oauth-state";

describe("oauth-state", () => {
  const prevRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const prevStrava = process.env.STRAVA_CLIENT_SECRET;
  const prevOura = process.env.OURA_CLIENT_SECRET;
  const prevWhoop = process.env.WHOOP_CLIENT_SECRET;

  afterEach(() => {
    for (const [key, value] of [
      ["SUPABASE_SERVICE_ROLE_KEY", prevRole],
      ["STRAVA_CLIENT_SECRET", prevStrava],
      ["OURA_CLIENT_SECRET", prevOura],
      ["WHOOP_CLIENT_SECRET", prevWhoop],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("round-trips a signed state for the matching provider", () => {
    process.env.OURA_CLIENT_SECRET = "oura-secret";
    const state = signOAuthState("user-1", "oura", "bearer", 1_000_000);
    const payload = verifyOAuthState(state, "oura", 1_000_100);
    expect(payload).toMatchObject({ u: "user-1", p: "oura", c: "bearer" });
    expect(verifyOAuthState(state, "strava", 1_000_100)).toBeNull();
  });

  it("rejects expired state", () => {
    process.env.STRAVA_CLIENT_SECRET = "strava-secret";
    const state = signOAuthState("user-1", "strava", "session", 1_000_000);
    expect(verifyOAuthState(state, "strava", 1_000_000 + 16 * 60 * 1000)).toBeNull();
  });

  it("rewrites authorizeUrl state", () => {
    process.env.WHOOP_CLIENT_SECRET = "whoop-secret";
    const next = withSignedOAuthState(
      "https://example.com/oauth?client_id=1&state=user-1",
      "user-1",
      "whoop",
      "session",
    );
    expect(next).toBeTruthy();
    const url = new URL(next!);
    expect(url.searchParams.get("state")).not.toBe("user-1");
    expect(verifyOAuthState(url.searchParams.get("state")!, "whoop")?.u).toBe("user-1");
  });

  it("leaves Garmin-style URLs without state alone", () => {
    const raw = "https://connect.garmin.com/oauthConfirm?oauth_token=abc";
    expect(withSignedOAuthState(raw, "user-1", "garmin", "bearer")).toBe(raw);
  });

  it("bearer channel accepts signed state without a session cookie", () => {
    process.env.STRAVA_CLIENT_SECRET = "strava-secret";
    const state = signOAuthState("user-9", "strava", "bearer");
    expect(
      resolveOAuthCallbackUserId({
        state,
        provider: "strava",
        sessionUserId: null,
      }),
    ).toBe("user-9");
  });

  it("bearer channel ignores a mismatched Safari session", () => {
    process.env.STRAVA_CLIENT_SECRET = "strava-secret";
    const state = signOAuthState("mobile-user", "strava", "bearer");
    expect(
      resolveOAuthCallbackUserId({
        state,
        provider: "strava",
        sessionUserId: "other-web-user",
      }),
    ).toBe("mobile-user");
  });

  it("session channel requires the browser session to match", () => {
    process.env.STRAVA_CLIENT_SECRET = "strava-secret";
    const state = signOAuthState("web-user", "strava", "session");
    expect(
      resolveOAuthCallbackUserId({
        state,
        provider: "strava",
        sessionUserId: null,
      }),
    ).toBeNull();
    expect(
      resolveOAuthCallbackUserId({
        state,
        provider: "strava",
        sessionUserId: "other",
      }),
    ).toBeNull();
    expect(
      resolveOAuthCallbackUserId({
        state,
        provider: "strava",
        sessionUserId: "web-user",
      }),
    ).toBe("web-user");
  });

});
