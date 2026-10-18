import { beforeEach, describe, it, expect, vi } from "vitest";

const stubs = vi.hoisted(() => ({
  user: vi.fn(),
  client: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/auth/request-user", () => ({
  resolveRequestUserId: stubs.user,
}));

vi.mock("@/lib/supabase/request", () => ({
  createRequestClient: stubs.client,
}));

import { POST } from "./route";

describe("crew leave request identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubs.client.mockResolvedValue({ rpc: stubs.rpc });
    stubs.rpc.mockResolvedValue({ data: true, error: null });
  });

  it("calls leave_crew with crewId for authenticated request", async () => {
    stubs.user.mockResolvedValue("athlete");
    const request = new Request("http://localhost/api/crews/leave", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ crewId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(stubs.client).toHaveBeenCalledWith(request);
    expect(stubs.rpc).toHaveBeenCalledWith("leave_crew", {
      p_crew_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
  });

  it("does not reach the database for an unauthenticated request", async () => {
    stubs.user.mockResolvedValue(null);
    const response = await POST(
      new Request("http://localhost/api/crews/leave", { method: "POST" }),
    );
    expect(response.status).toBe(401);
    expect(stubs.client).not.toHaveBeenCalled();
  });
});
