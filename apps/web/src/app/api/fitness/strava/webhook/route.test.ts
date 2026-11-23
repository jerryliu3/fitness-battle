import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  sync: vi.fn(),
  userIdForAthlete: vi.fn(),
  afterFns: [] as Array<() => Promise<void>>,
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (fn: () => Promise<void>) => {
      mocks.afterFns.push(fn);
    },
  };
});

vi.mock("@/lib/env", () => ({
  serverEnv: {
    stravaWebhookVerifyToken: "a".repeat(32),
  },
}));

vi.mock("@/lib/background-fitness-sync", () => ({
  syncConnectedProviderForUser: mocks.sync,
}));

vi.mock("@/lib/fitness-store", () => ({
  userIdForAthlete: mocks.userIdForAthlete,
}));

import { GET, POST } from "./route";

describe("strava webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.afterFns.length = 0;
  });

  it("echoes hub.challenge when verify_token matches", async () => {
    const res = await GET(
      new Request(
        `https://example.com/api/fitness/strava/webhook?hub.mode=subscribe&hub.verify_token=${"a".repeat(32)}&hub.challenge=xyz`,
      ),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ "hub.challenge": "xyz" });
  });

  it("rejects invalid verify_token", async () => {
    const res = await GET(
      new Request(
        "https://example.com/api/fitness/strava/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=xyz",
      ),
    );
    expect(res.status).toBe(403);
  });

  it("triggers async Strava sync on activity create", async () => {
    mocks.userIdForAthlete.mockResolvedValue("user-strava-1");
    const res = await POST(
      new Request("https://example.com/api/fitness/strava/webhook", {
        method: "POST",
        body: JSON.stringify({
          object_type: "activity",
          aspect_type: "create",
          owner_id: 12345,
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(mocks.afterFns).toHaveLength(1);
    await mocks.afterFns[0]!();
    expect(mocks.userIdForAthlete).toHaveBeenCalledWith("strava", "12345");
    expect(mocks.sync).toHaveBeenCalledWith("user-strava-1", "strava");
  });
});
