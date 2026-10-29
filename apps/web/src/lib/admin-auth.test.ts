import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ type: "mock-supabase-admin-client" })),
}));

vi.mock("@/lib/supabase/request", () => ({
  createRequestClient: vi.fn(),
}));

vi.mock("@/lib/supabase/config", () => ({
  getSupabaseConfig: vi.fn(() => ({
    configured: true,
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "test-anon-key",
  })),
}));

vi.mock("@/lib/env", () => ({
  serverEnv: {
    supabaseServiceRoleKey: "test-service-key",
  },
}));

import { authorizeAdmin, adminDatabase } from "./admin-auth";
import { createRequestClient } from "./supabase/request";
import { getSupabaseConfig } from "./supabase/config";
import { serverEnv } from "./env";

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
    it("returns null when Supabase is not configured", async () => {
      vi.mocked(getSupabaseConfig).mockReturnValue({
        configured: false,
        supabaseUrl: "",
        supabaseAnonKey: "",
      });
      const req = new Request("https://example.com/api/admin/compete");
      const result = await authorizeAdmin(req);
      expect(result).toBeNull();
      expect(createRequestClient).not.toHaveBeenCalled();
    });

    it("returns null when getUser fails with an error", async () => {
      vi.mocked(createRequestClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error("Invalid token"),
          }),
        },
      } as never);

      const req = new Request("https://example.com/api/admin/compete");
      const result = await authorizeAdmin(req);
      expect(result).toBeNull();
    });

    it("returns null when user is signed out or null", async () => {
      vi.mocked(createRequestClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      } as never);

      const req = new Request("https://example.com/api/admin/compete");
      const result = await authorizeAdmin(req);
      expect(result).toBeNull();
    });

    it("returns null when user has an unconfirmed email", async () => {
      vi.mocked(createRequestClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "user-jerry",
                email: "3jerryliu@gmail.com",
                email_confirmed_at: null,
              },
            },
            error: null,
          }),
        },
      } as never);

      const req = new Request("https://example.com/api/admin/compete");
      const result = await authorizeAdmin(req);
      expect(result).toBeNull();
    });

    it("returns null when user is not in the admin email list", async () => {
      vi.mocked(createRequestClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "user-bob",
                email: "bob@example.com",
                email_confirmed_at: "2026-01-01T00:00:00Z",
              },
            },
            error: null,
          }),
        },
      } as never);

      const req = new Request("https://example.com/api/admin/compete");
      const result = await authorizeAdmin(req);
      expect(result).toBeNull();
    });

    it("authorizes 3jerryliu@gmail.com with confirmed email", async () => {
      vi.mocked(createRequestClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "user-jerry-id",
                email: "3jerryliu@gmail.com",
                email_confirmed_at: "2026-01-01T00:00:00Z",
              },
            },
            error: null,
          }),
        },
      } as never);

      const req = new Request("https://example.com/api/admin/compete");
      const result = await authorizeAdmin(req);
      expect(result).toBe("user-jerry-id");
    });

    it("authorizes alice@example.com with confirmed email", async () => {
      vi.mocked(createRequestClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "user-alice-id",
                email: "alice@example.com",
                email_confirmed_at: "2026-01-01T00:00:00Z",
              },
            },
            error: null,
          }),
        },
      } as never);

      const req = new Request("https://example.com/api/admin/compete");
      const result = await authorizeAdmin(req);
      expect(result).toBe("user-alice-id");
    });
  });

  describe("adminDatabase", () => {
    it("returns null if supabaseServiceRoleKey is absent", () => {
      (serverEnv as { supabaseServiceRoleKey?: string }).supabaseServiceRoleKey = "";
      expect(adminDatabase()).toBeNull();
    });

    it("returns client if supabaseServiceRoleKey is present", () => {
      expect(adminDatabase()).not.toBeNull();
    });
  });
});
