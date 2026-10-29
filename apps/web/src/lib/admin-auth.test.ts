import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ type: "mock-supabase-admin-client" })),
}));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: vi.fn() }));
vi.mock("@/lib/supabase/config", () => ({ getSupabaseConfig: vi.fn() }));
vi.mock("@/lib/env", () => ({ serverEnv: { supabaseServiceRoleKey: "test-service-key" } }));

import { authorizeAdmin, adminDatabase } from "./admin-auth";
import { createRequestClient } from "./supabase/request";
import { getSupabaseConfig } from "./supabase/config";
import { serverEnv } from "./env";

function mockAuthUser(user: unknown, error: unknown = null) {
  vi.mocked(createRequestClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error }) },
  } as never);
}

describe("admin-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseConfig).mockReturnValue({
      configured: true,
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "test-anon-key",
    });
    serverEnv.supabaseServiceRoleKey = "test-service-key";
  });

  describe("authorizeAdmin", () => {
    it("returns null when Supabase is unconfigured or getUser errors", async () => {
      vi.mocked(getSupabaseConfig).mockReturnValue({ configured: false, supabaseUrl: "", supabaseAnonKey: "" });
      const req = new Request("https://example.com/api/admin/compete");
      expect(await authorizeAdmin(req)).toBeNull();

      vi.mocked(getSupabaseConfig).mockReturnValue({ configured: true, supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "k" });
      mockAuthUser(null, new Error("token error"));
      expect(await authorizeAdmin(req)).toBeNull();
    });

    it("returns null for non-admin, unconfirmed, or signed-out users", async () => {
      const req = new Request("https://example.com/api/admin/compete");
      for (const user of [
        null,
        { id: "u1", email: "3jerryliu@gmail.com", email_confirmed_at: null },
        { id: "u2", email: "bob@example.com", email_confirmed_at: "2026-01-01T00:00:00Z" },
      ]) {
        mockAuthUser(user);
        expect(await authorizeAdmin(req)).toBeNull();
      }
    });

    it("authorizes confirmed admin users", async () => {
      const req = new Request("https://example.com/api/admin/compete");
      mockAuthUser({ id: "jerry-id", email: "3jerryliu@gmail.com", email_confirmed_at: "2026-01-01T00:00:00Z" });
      expect(await authorizeAdmin(req)).toBe("jerry-id");

      mockAuthUser({ id: "alice-id", email: "alice@example.com", email_confirmed_at: "2026-01-01T00:00:00Z" });
      expect(await authorizeAdmin(req)).toBe("alice-id");
    });
  });

  describe("adminDatabase", () => {
    it("checks for supabaseServiceRoleKey", () => {
      expect(adminDatabase()).not.toBeNull();
      (serverEnv as { supabaseServiceRoleKey?: string }).supabaseServiceRoleKey = "";
      expect(adminDatabase()).toBeNull();
    });
  });
});
