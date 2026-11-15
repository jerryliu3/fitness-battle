import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";

vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: vi.fn() }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: vi.fn() }));
vi.mock("@/lib/competition-authority", () => ({ competitionAuthorityDatabase: () => ({}) }));
vi.mock("@/lib/compete-persist", () => ({
  loadCompeteAccount: vi.fn(),
  loadEffortScoreEvents: vi.fn().mockResolvedValue([]),
  persistCompeteAccount: vi.fn(),
  settleAccountFields: vi.fn(),
}));

import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";
import { loadCompeteAccount, persistCompeteAccount, settleAccountFields } from "@/lib/compete-persist";
import { POST } from "./route";

function request(body: object) {
  return new Request("https://test.local/api/compete/intents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId: "athlete", updatedAt: "base-version", ...body }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveRequestUserId).mockResolvedValue("athlete");
  vi.mocked(createRequestClient).mockResolvedValue({ rpc: async () => ({ data: 0, error: null }) } as never);
  vi.mocked(loadCompeteAccount).mockResolvedValue({ state: freshState(), updatedAt: "base-version" });
  vi.mocked(settleAccountFields).mockImplementation(async (_db, _user, state) => state);
  vi.mocked(persistCompeteAccount).mockResolvedValue("new-version");
});

describe("POST /api/compete/intents", () => {
  it("requires a revision base and valid intent list", async () => {
    expect((await POST(request({ updatedAt: undefined }))).status).toBe(409);
    expect((await POST(request({ actions: [{ type: "log-manual" }] }))).status).toBe(400);
  });

  it("persists normalized intents on the server baseline", async () => {
    const response = await POST(
      request({ actions: [{ type: "rename", name: "Pat" }] }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.state.name).toBe("Pat");
    expect(settleAccountFields).toHaveBeenCalledTimes(2);
    expect(persistCompeteAccount).toHaveBeenCalledWith(
      expect.anything(),
      "athlete",
      expect.objectContaining({ name: "Pat" }),
      "base-version",
      expect.objectContaining({ receipts: 0 }),
    );
  });

  it("accepts manual logging intents", async () => {
    const response = await POST(
      request({
        actions: [
          {
            type: "log-manual",
            sport: "running",
            activityId: "manual-api",
            movingSec: 1800,
            distanceM: 5000,
          },
        ],
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.state.activities.some((a: { id: string }) => a.id === "manual-api")).toBe(
      true,
    );
  });

  it("rejects malformed disposition intents", async () => {
    const response = await POST(
      request({
        actions: [{ type: "set-disposition", activityId: "", disposition: "excluded" }],
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_intent" });
  });
});