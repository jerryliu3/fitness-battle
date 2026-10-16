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
describe("crew join request identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubs.client.mockResolvedValue({ rpc: stubs.rpc });
    stubs.rpc.mockResolvedValue({ data: { id: "crew" }, error: null });
  });
  it("passes the original authenticated mobile request into the RLS client", async () => {
    stubs.user.mockResolvedValue("athlete");
    const request = new Request("http://localhost/api/crews/join", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: "CREW42" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(stubs.client).toHaveBeenCalledWith(request);
    expect(stubs.rpc).toHaveBeenCalledWith("join_crew", { p_code: "CREW42" });
  });
  it("does not reach the database for an unauthenticated request", async () => {
    stubs.user.mockResolvedValue(null);
    const response = await POST(
      new Request("http://localhost/api/crews/join", { method: "POST" }),
    );
    expect(response.status).toBe(401);
    expect(stubs.client).not.toHaveBeenCalled();
  });
});
