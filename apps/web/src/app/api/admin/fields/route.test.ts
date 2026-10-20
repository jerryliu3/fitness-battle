import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/admin-auth", () => ({ authorizeAdmin: vi.fn(), adminDatabase: vi.fn() }));
vi.mock("@/lib/compete-persist", () => ({ loadCompeteAccount: vi.fn() }));
vi.mock("@/lib/admin-settlement", () => ({ readAdminSettlementFields: vi.fn() }));
import { authorizeAdmin, adminDatabase } from "@/lib/admin-auth";
import { GET, POST } from "./route";
const id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => { vi.clearAllMocks(); vi.mocked(authorizeAdmin).mockResolvedValue(id); });
describe("admin field controls authorization", () => {
 it("denies non-admin reads before creating a service client", async () => {
  vi.mocked(authorizeAdmin).mockResolvedValue(null);
  expect((await GET(new Request(`https://test.local/api/admin/fields?target=${id}`))).status).toBe(403);
  expect(adminDatabase).not.toHaveBeenCalled();
 });
 it("rejects cross-origin writes", async () => {
  expect((await POST(new Request("https://test.local/api/admin/fields", { method: "POST", headers: { origin: "https://other.local" }, body: "{}" }))).status).toBe(403);
  expect(adminDatabase).not.toHaveBeenCalled();
 });
 it("requires an explicit field confirmation and reason", async () => {
  expect((await POST(new Request("https://test.local/api/admin/fields", { method: "POST", body: JSON.stringify({ target: id, fieldId: id, actionId: id, action: "restart-field", updatedAt: "version", reason: "Real test reason", confirmation: "WRONG" }) }))).status).toBe(400);
  expect(adminDatabase).not.toHaveBeenCalled();
 });
});
