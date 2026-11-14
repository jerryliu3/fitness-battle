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
  return new Request("https://test.local/api/compete/sync", {
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

describe("POST /api/compete/sync", () => {
  it("rejects unknown sync kinds", async () => {
    expect((await POST(request({ action: { type: "rename", name: "x" } }))).status).toBe(400);
  });

  it("applies import-history on the server baseline", async () => {
    const response = await POST(request({ action: { type: "import-history" } }));
    expect(response.status).toBe(200);
    expect(persistCompeteAccount).toHaveBeenCalled();
  });
});