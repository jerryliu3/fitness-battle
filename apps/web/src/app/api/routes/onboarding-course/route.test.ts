import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ rpc: vi.fn(), configured: true }));
vi.mock("@/lib/supabase/config", () => ({ getSupabaseConfig: () => ({ configured: mock.configured }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mock.rpc }) }));
import { GET } from "./route";

beforeEach(() => { vi.clearAllMocks(); mock.configured = true; });

it("returns bundled geometry when Supabase is unavailable", async () => {
  mock.configured = false;
  const response = await GET();
  expect(response.status).toBe(200);
  expect((await response.json()).routeId).toBe("bundle");
});

it("serves the assigned surface route when configured", async () => {
  mock.rpc.mockResolvedValue({
    data: { routeId: "onboarding-overtake", name: "Park", coordinates: [[0, 0], [0.02, 0]] },
    error: null,
  });
  const response = await GET();
  expect(response.headers.get("cache-control")).toContain("public");
  expect((await response.json()).name).toBe("Park");
});