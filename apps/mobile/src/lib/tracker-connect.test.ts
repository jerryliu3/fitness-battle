import { describe, expect, it, vi } from "vitest";

vi.mock("expo-linking", () => ({
  addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  getInitialURL: vi.fn(async () => null),
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
  isAuthReturnUrl,
  isReturnUrlForProvider,
  outcomeFromReturnUrl,
  startCloudTrackerConnect,
} from "./tracker-connect";

describe("outcomeFromReturnUrl", () => {
  it("reads tracker and provider from a path-style deep link", () => {
    expect(
      outcomeFromReturnUrl("overtaek:///you?tracker=connected&provider=oura"),
    ).toEqual({ tracker: "connected", provider: "oura" });
  });

  it("reads tracker from a host-style deep link", () => {
    expect(
      outcomeFromReturnUrl("overtaek://you?tracker=connected&provider=strava"),
    ).toEqual({ tracker: "connected", provider: "strava" });
  });

  it("ignores unknown outcomes", () => {
    expect(outcomeFromReturnUrl("overtaek:///you?tracker=weird&provider=oura")).toEqual({
      tracker: undefined,
      provider: "oura",
    });
  });
});

describe("isAuthReturnUrl / isReturnUrlForProvider", () => {
  it("accepts both slash styles", () => {
    expect(isAuthReturnUrl("overtaek:///you?tracker=connected")).toBe(true);
    expect(isAuthReturnUrl("overtaek://you?tracker=connected")).toBe(true);
    expect(isAuthReturnUrl("https://example.com/you")).toBe(false);
  });

  it("rejects another provider's return URL", () => {
    expect(
      isReturnUrlForProvider(
        "overtaek:///you?tracker=connected&provider=strava",
        "oura",
      ),
    ).toBe(false);
    expect(
      isReturnUrlForProvider(
        "overtaek:///you?tracker=connected&provider=oura",
        "oura",
      ),
    ).toBe(true);
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
      onAppUrl: () => () => undefined,
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

  it("captures a deep link delivered while the auth sheet is open", async () => {
    let handler: ((url: string) => void) | null = null;
    const openAuthSession = vi.fn(async () => {
      handler?.("overtaek://you?tracker=connected&provider=oura");
      return { type: "dismiss" };
    });

    const result = await startCloudTrackerConnect("oura", {
      apiUrl: "https://example.com",
      getAccessToken: async () => "token",
      fetchFn: vi.fn(async () =>
        Response.json({
          authorizeUrl: "https://cloud.ouraring.com/oauth/authorize",
        }),
      ) as unknown as typeof fetch,
      openAuthSession,
      onAppUrl: (next) => {
        handler = next;
        return () => {
          handler = null;
        };
      },
    });

    expect(result).toEqual({
      ok: true,
      tracker: "connected",
      provider: "oura",
      message: "oura connected.",
    });
  });

  it("recovers when the deep link arrives shortly after dismiss", async () => {
    let handler: ((url: string) => void) | null = null;
    const openAuthSession = vi.fn(async () => {
      setTimeout(() => {
        handler?.("overtaek:///you?tracker=connected&provider=oura");
      }, 20);
      return { type: "dismiss" };
    });

    const result = await startCloudTrackerConnect("oura", {
      apiUrl: "https://example.com",
      getAccessToken: async () => "token",
      fetchFn: vi.fn(async () =>
        Response.json({
          authorizeUrl: "https://cloud.ouraring.com/oauth/authorize",
        }),
      ) as unknown as typeof fetch,
      openAuthSession,
      onAppUrl: (next) => {
        handler = next;
        return () => {
          handler = null;
        };
      },
    });

    expect(result).toEqual({
      ok: true,
      tracker: "connected",
      provider: "oura",
      message: "oura connected.",
    });
  });

  it("does not treat another provider's deep link as success after dismiss", async () => {
    let handler: ((url: string) => void) | null = null;
    const resultPromise = startCloudTrackerConnect("oura", {
      apiUrl: "https://example.com",
      getAccessToken: async () => "token",
      fetchFn: vi.fn(async () =>
        Response.json({
          authorizeUrl: "https://cloud.ouraring.com/oauth/authorize",
        }),
      ) as unknown as typeof fetch,
      openAuthSession: vi.fn(async () => {
        handler?.("overtaek:///you?tracker=connected&provider=strava");
        return { type: "dismiss" };
      }),
      onAppUrl: (next) => {
        handler = next;
        return () => {
          handler = null;
        };
      },
      returnUrlWaitMs: 20,
    });

    await expect(resultPromise).resolves.toEqual({
      ok: false,
      cancelled: true,
      message: "Connect cancelled.",
    });
  });

  it("reports cancel when the auth sheet is dismissed with no deep link", async () => {
    const result = await startCloudTrackerConnect("strava", {
      apiUrl: "https://example.com",
      getAccessToken: async () => "token",
      fetchFn: vi.fn(async () =>
        Response.json({
          authorizeUrl: "https://www.strava.com/oauth/authorize",
        }),
      ) as unknown as typeof fetch,
      openAuthSession: vi.fn(async () => ({ type: "cancel" })),
      onAppUrl: () => () => undefined,
      returnUrlWaitMs: 20,
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
