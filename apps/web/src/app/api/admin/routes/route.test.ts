import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ actor: "admin" as string | null, rpc: vi.fn(), from: vi.fn(), database: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ authorizeAdmin: async () => mock.actor, adminDatabase: mock.database }));
import { GET, POST } from "./route";
const input = { id: "park-loop", name: "Park", location: "New York", coordinates: [[0, 0], [.02, 0]], is_active: true, updatedAt: null };
function request(body: unknown = input) { return new Request("https://test/api/admin/routes", { method: "POST", body: JSON.stringify(body) }); }
beforeEach(() => { vi.clearAllMocks(); mock.actor = "admin"; mock.database.mockReturnValue({ rpc: mock.rpc, from: mock.from }); });
it("checks owner authorization and same-origin writes before creating a service client", async () => {
  mock.actor = null;
  expect((await GET(new Request("https://test/api/admin/routes"))).status).toBe(403);
  expect((await POST(request())).status).toBe(403);
  mock.actor = "admin";
  const cross = request(); cross.headers.set("origin", "https://elsewhere.test");
  expect((await POST(cross)).status).toBe(403);
  expect(mock.database).not.toHaveBeenCalled();
});
it("reads metadata separately from an editable route", async () => {
  const query = { select: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [input], error: null }), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: input, error: null }) };
  mock.from.mockReturnValue(query);
  const list = await GET(new Request("https://test/api/admin/routes"));
  expect(list.status).toBe(200); expect(list.headers.get("cache-control")).toBe("private, no-store");
  expect(query.select.mock.calls[0][0]).not.toContain("coordinates");
  const detail = await GET(new Request("https://test/api/admin/routes?id=park-loop"));
  expect((await detail.json()).route.id).toBe("park-loop");
  expect(query.eq).toHaveBeenCalledWith("id", "park-loop");
});
it("validates and bounds geometry before any privileged write", async () => {
  expect((await POST(request({ ...input, coordinates: [[999, 0], [0, 0]] }))).status).toBe(400);
  expect((await POST(new Request("https://test/api/admin/routes", { method: "POST", body: 'x'.repeat(4 * 1024 * 1024 + 1) }))).status).toBe(413);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("saves through the audited RPC using the server-derived actor and observed revision", async () => {
  mock.rpc.mockResolvedValue({ data: { ...input, updated_at: "v2" }, error: null });
  expect((await POST(request({ ...input, actor: "forged", updatedAt: "2026-10-28T12:00:00Z" }))).status).toBe(200);
  expect(mock.rpc).toHaveBeenCalledWith("admin_save_race_route", expect.objectContaining({ p_actor_id: "admin", p_expected_updated_at: "2026-10-28T12:00:00Z", p_route_id: "park-loop" }));
});
it("reports edit conflicts and keeps database details private", async () => {
  mock.rpc.mockResolvedValue({ error: { code: "40001", message: "sensitive" }, data: null });
  expect((await POST(request())).status).toBe(409);
  mock.rpc.mockRejectedValue(new Error("private credentials"));
  const response = await POST(request());
  expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain("credentials");
});
