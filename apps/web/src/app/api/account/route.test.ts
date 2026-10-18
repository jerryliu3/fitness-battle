import { beforeEach, describe, it, expect, vi } from "vitest";

const stubs = vi.hoisted(() => ({
  user: vi.fn(),
  deleteUser: vi.fn(),
  createAdminClient: vi.fn(),
  webEnv: { useDemoData: false },
  serverEnv: { supabaseServiceRoleKey: "test-service-key" },
}));

vi.mock("@/lib/auth/request-user", () => ({
  resolveRequestUserId: stubs.user,
}));

vi.mock("@/lib/env", () => ({
  webEnv: stubs.webEnv,
  serverEnv: stubs.serverEnv,
}));

vi.mock("@/lib/supabase/config", () => ({
  getSupabaseConfig: () => ({
    supabaseUrl: "https://test.supabase.co",
    supabaseAnonKey: "anon-key",
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => {
    stubs.createAdminClient(...args);
    return {
      auth: {
        admin: {
          deleteUser: stubs.deleteUser,
        },
      },
    };
  },
}));

import { DELETE } from "./route";

describe("account deletion route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubs.webEnv.useDemoData = false;
    stubs.serverEnv.supabaseServiceRoleKey = "test-service-key";
    stubs.deleteUser.mockResolvedValue({ error: null });
  });

  it("rejects mismatched origin requests", async () => {
    const request = new Request("http://localhost:3000/api/account", {
      method: "DELETE",
      headers: { Origin: "http://malicious-site.com" },
    });
    const response = await DELETE(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Invalid request origin.");
  });

  it("returns 401 when unauthenticated", async () => {
    stubs.user.mockResolvedValue(null);
    const request = new Request("http://localhost:3000/api/account", {
      method: "DELETE",
      headers: { Origin: "http://localhost:3000" },
    });
    const response = await DELETE(request);
    expect(response.status).toBe(401);
  });

  it("deletes user via admin client when authenticated", async () => {
    stubs.user.mockResolvedValue("user-123");
    const request = new Request("http://localhost:3000/api/account", {
      method: "DELETE",
      headers: { Origin: "http://localhost:3000" },
    });
    const response = await DELETE(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(stubs.deleteUser).toHaveBeenCalledWith("user-123");
  });

  it("handles demo mode without reaching admin client", async () => {
    stubs.webEnv.useDemoData = true;
    stubs.user.mockResolvedValue("user-demo");
    const request = new Request("http://localhost:3000/api/account", {
      method: "DELETE",
      headers: { Origin: "http://localhost:3000" },
    });
    const response = await DELETE(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.demo).toBe(true);
    expect(stubs.deleteUser).not.toHaveBeenCalled();
  });

  it("returns 500 when Supabase admin deletion fails", async () => {
    stubs.user.mockResolvedValue("user-123");
    stubs.deleteUser.mockResolvedValue({
      error: new Error("Database error while deleting user"),
    });
    const request = new Request("http://localhost:3000/api/account", {
      method: "DELETE",
      headers: { Origin: "http://localhost:3000" },
    });
    const response = await DELETE(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Database error while deleting user");
  });
});
