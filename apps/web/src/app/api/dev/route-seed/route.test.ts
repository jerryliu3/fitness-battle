import { afterEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ configured: false, read: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile: mock.read }));
vi.mock("@/lib/supabase/config", () => ({ getSupabaseConfig: () => ({ configured: mock.configured }) }));
import { GET } from "./route";
afterEach(() => { vi.unstubAllEnvs(); mock.configured = false; vi.clearAllMocks(); });
describe("private local route seed", () => {
  it("never exposes fixtures in production, configured accounts, or a public host", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await GET(new Request("http://localhost/api/dev/route-seed?account=alice"))).status).toBe(404);
    vi.stubEnv("NODE_ENV", "development");
    expect((await GET(new Request("https://example.com/api/dev/route-seed?account=alice"))).status).toBe(404);
    mock.configured = true;
    expect((await GET(new Request("http://localhost/api/dev/route-seed?account=alice"))).status).toBe(404);
    expect(mock.read).not.toHaveBeenCalled();
  });
  it("loads local demo files as Open imports without claiming GPS verification", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mock.read.mockResolvedValue(JSON.stringify({ activities: [{ id: "local-route-one", provider: "garmin", externalId: "one", categorySlug: "running", metricValue: 10000, movingSec: 3000, startedAt: "2026-10-23T12:00:00Z", rawName: "Run", detailedPolyline: "test-geometry" }] }));
    const response = await GET(new Request("http://localhost/api/dev/route-seed?account=alice"));
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).activities[0]).toMatchObject({ provenance: "imported", disposition: "counted", verified: false, detailedPolyline: "test-geometry" });
  });
});
