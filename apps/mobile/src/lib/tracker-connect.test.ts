import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Linking: { openURL: vi.fn() },
}));

vi.mock("expo-web-browser", () => ({
  openAuthSessionAsync: vi.fn(),
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

import {
  AUTH_RETURN_URL,
  outcomeFromReturnUrl,
  startCloudTrackerConnect,
} from "./tracker-connect";

describe("outcomeFromReturnUrl", () => {
  it("reads tracker and provider from a deep link", () => {
    expect(
      outcomeFromReturnUrl("overtaek:///you?tracker=connected&provider=oura"),
    ).toEqual({ tracker: "connected", provider: "oura" });
  });

  it("ignores unknown outcomes", () => {
    expect(outcomeFromReturnUrl("overtaek:///you?tracker=weird&provider=oura")).toEqual({
      tracker: undefined,
      provider: "oura",
    });
  });
});

describe("startCloudTrackerConnect", () => {
  it("requires a session", async () => {
    const result = await startCloudTrackerConnect("oura", {
      apiUrl: "https://example.com",
      getAccessToken: async () => undefined,
      fetchFn: vi.fn(),
      openAuthSession: vi.fn(),
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/sign in/i);
  });

  it("opens an auth session and applies a connected return URL", async () => {
    const openAuthSession = vi.fn(async () => ({
      type: "success",
      url: "overtaek:///you?tracker=connected&provider=oura",
    }));
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
      openAuthSession,
    });
    expect(result).toEqual({
      ok: true,
      tracker: "connected",
      provider: "oura",
      message: "oura connected.",
    });
    expect(openAuthSession).toHaveBeenCalledWith(
      "https://cloud.ouraring.com/oauth/authorize?state=signed",
      AUTH_RETURN_URL,
    );
  });

  it("reports cancel when the auth sheet is dismissed", async () => {
    const result = await startCloudTrackerConnect("strava", {
      apiUrl: "https://example.com",
      getAccessToken: async () => "token",
      fetchFn: vi.fn(async () =>
        Response.json({
          authorizeUrl: "https://www.strava.com/oauth/authorize",
        }),
      ) as unknown as typeof fetch,
      openAuthSession: vi.fn(async () => ({ type: "cancel" })),
    });
    expect(result).toEqual({
      ok: false,
      cancelled: true,
      message: "Connect cancelled.",
    });
  });

  it("treats stub API responses as demo links", async () => {
    const result = await startCloudTrackerConnect("strava", {
      apiUrl: "https://example.com",
      getAccessToken: async () => "token",
      fetchFn: vi.fn(async () =>
        Response.json({ status: "stub", message: "No keys" }),
      ) as unknown as typeof fetch,
      openAuthSession: vi.fn(),
    });
    expect(result).toEqual({
      ok: true,
      stub: true,
      tracker: "stub",
      provider: "strava",
      message: "No keys",
    });
  });
});
