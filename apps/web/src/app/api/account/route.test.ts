import { beforeEach, describe, expect, it, vi } from "vitest";

const stubs = vi.hoisted(() => ({
  configured: true,
  user: vi.fn(),
  deleteUser: vi.fn(),
  listPhotos: vi.fn(),
  removePhotos: vi.fn(),
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
    configured: stubs.configured,
    supabaseUrl: "https://test.supabase.co",
    supabaseAnonKey: "anon-key",
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => {
    stubs.createAdminClient(...args);
    return {
      storage: {
        from: () => ({ list: stubs.listPhotos, remove: stubs.removePhotos }),
      },
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
    stubs.configured = true;
    stubs.serverEnv.supabaseServiceRoleKey = "test-service-key";
    stubs.deleteUser.mockResolvedValue({ error: null });
    stubs.listPhotos.mockResolvedValue({ data: [], error: null });
    stubs.removePhotos.mockResolvedValue({ error: null });
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

  it("handles an offline preview without reaching admin client", async () => {
    stubs.configured = false;
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

  it("does not claim deletion succeeded when the server admin key is missing", async () => {
    stubs.user.mockResolvedValue("user-123");
    stubs.serverEnv.supabaseServiceRoleKey = "";
    const response = await DELETE(
      new Request("http://localhost:3000/api/account", { method: "DELETE" }),
    );
    expect(response.status).toBe(503);
    expect(stubs.deleteUser).not.toHaveBeenCalled();
  });

  it("removes only the authenticated user's avatar objects before deleting auth", async () => {
    stubs.user.mockResolvedValue("user-123");
    stubs.listPhotos.mockResolvedValue({
      data: [
        { id: "photo", name: "avatar.jpg" },
        { id: "old", name: "legacy.png" },
      ],
      error: null,
    });
    const response = await DELETE(
      new Request("http://localhost:3000/api/account", {
        method: "DELETE",
        headers: { Authorization: "Bearer mobile-token" },
      }),
    );
    expect(response.status).toBe(200);
    expect(stubs.listPhotos).toHaveBeenCalledWith("user-123", { limit: 1000 });
    expect(stubs.removePhotos).toHaveBeenCalledWith([
      "user-123/avatar.jpg",
      "user-123/legacy.png",
    ]);
    expect(stubs.removePhotos.mock.invocationCallOrder[0]).toBeLessThan(
      stubs.deleteUser.mock.invocationCallOrder[0],
    );
  });

  it("does not falsely report deletion if Storage cleanup fails", async () => {
    stubs.user.mockResolvedValue("user-123");
    stubs.listPhotos.mockResolvedValue({
      data: [{ id: "photo", name: "avatar.jpg" }],
      error: null,
    });
    stubs.removePhotos.mockResolvedValue({ error: new Error("offline") });
    const response = await DELETE(
      new Request("http://localhost:3000/api/account", { method: "DELETE" }),
    );
    expect(response.status).toBe(500);
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
