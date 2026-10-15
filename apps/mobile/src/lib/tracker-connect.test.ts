import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Linking: { openURL: vi.fn() },
}));

vi.mock("./env", () => ({
  mobileEnv: { apiUrl: "https://example.test" },
}));

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
    },
  },
}));

import { startCloudTrackerConnect } from "./tracker-connect";

describe("startCloudTrackerConnect", () => {
  it("requires a session", async () => {
    const result = await startCloudTrackerConnect("oura", {
      apiUrl: "https://example.com",
      getAccessToken: async () => undefined,
      fetchFn: vi.fn(),
      openUrl: vi.fn(),
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/sign in/i);
  });

  it("opens the authorize URL in the system browser", async () => {
    const openUrl = vi.fn(async () => undefined);
    const fetchFn = vi.fn(async () =>
      Response.json({
        authorizeUrl: "https://cloud.ouraring.com/oauth/authorize?state=signed",
        status: "disconnected",
      }),
    );
    const result = await startCloudTrackerConnect("oura", {
      apiUrl: "https://example.com",
      getAccessToken: async () => "token",
      fetchFn: fetchFn as unknown as typeof fetch,
      openUrl,
    });
    expect(result.ok).toBe(true);
    expect(result.openedBrowser).toBe(true);
    expect(openUrl).toHaveBeenCalledWith(
      "https://cloud.ouraring.com/oauth/authorize?state=signed",
    );
    expect(fetchFn).toHaveBeenCalledWith(
      "https://example.com/api/fitness/connect",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token",
        }),
      }),
    );
  });

  it("treats stub responses as demo links", async () => {
    const result = await startCloudTrackerConnect("strava", {
      apiUrl: "https://example.com",
      getAccessToken: async () => "token",
      fetchFn: vi.fn(async () =>
        Response.json({ status: "stub", message: "No keys" }),
      ) as unknown as typeof fetch,
      openUrl: vi.fn(),
    });
    expect(result).toEqual({
      ok: true,
      stub: true,
      message: "No keys",
    });
  });
});
