import { describe, expect, it, vi } from "vitest";
import { createGarminProvider } from "./garmin-provider";
import type { StravaStore, StravaTokenSet } from "./strava-provider";
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
