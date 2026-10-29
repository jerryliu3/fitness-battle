import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ bearer: vi.fn(), cookie: vi.fn() }));
vi.mock("@/lib/env", () => ({ webEnv: { useDemoData: true } }));
vi.mock("@/lib/supabase/config", () => ({ getSupabaseConfig: () => ({ configured: true, supabaseUrl: "https://test.supabase.co", supabaseAnonKey: "public-test-key" }) }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getUser: mock.bearer } }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mock.cookie } }) }));
import { resolveRequestUser, resolveRequestUserId } from "./request-user";
beforeEach(() => { vi.clearAllMocks(); mock.bearer.mockResolvedValue({ data: { user: { id: "synthetic-real-auth", email: "bearer@example.com" } }, error: null }); mock.cookie.mockResolvedValue({ data: { user: { id: "cookie-user", email: "cookie@example.com" } }, error: null }); });
it("uses a real Bearer session for synthetic accounts even with the old fixture flag enabled", async () => {
  expect(await resolveRequestUserId(new Request("https://app.test", { headers: { Authorization: "Bearer token" } }), "spoofed-id")).toBe("synthetic-real-auth");
  expect(await resolveRequestUser(new Request("https://app.test", { headers: { Authorization: "Bearer token" } }), "spoofed-id")).toEqual({ id: "synthetic-real-auth", email: "bearer@example.com" });
});
it("does not fall back to a body id or cookie after an invalid Bearer token", async () => {
  mock.bearer.mockResolvedValue({ data: { user: null }, error: { message: "invalid" } });
  expect(await resolveRequestUserId(new Request("https://app.test", { headers: { Authorization: "Bearer bad" } }), "spoofed-id")).toBeNull();
  expect(await resolveRequestUser(new Request("https://app.test", { headers: { Authorization: "Bearer bad" } }), "spoofed-id")).toBeNull();
  expect(mock.cookie).not.toHaveBeenCalled();
});
it("validates the cookie session instead of accepting a client account id", async () => {
  expect(await resolveRequestUserId(new Request("https://app.test"), "spoofed-id")).toBe("cookie-user");
  expect(await resolveRequestUser(new Request("https://app.test"), "spoofed-id")).toEqual({ id: "cookie-user", email: "cookie@example.com" });
});
