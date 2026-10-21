import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: vi.fn() }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: vi.fn() }));
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";
import { GET, POST } from "./route";
const id = "00000000-0000-4000-8000-000000000001";
const rpc = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveRequestUserId).mockResolvedValue("athlete");
  vi.mocked(createRequestClient).mockResolvedValue({ rpc } as never);
});
it("requires authentication before reads or writes", async () => {
  vi.mocked(resolveRequestUserId).mockResolvedValue(null);
  expect(
    (await GET(new Request("https://test/api/crews/sessions?crewId=" + id)))
      .status,
  ).toBe(401);
  expect(
    (
      await POST(
        new Request("https://test/api/crews/sessions", {
          method: "POST",
          body: "{}",
        }),
      )
    ).status,
  ).toBe(401);
  expect(rpc).not.toHaveBeenCalled();
});
it("rejects malformed or coercible RSVP input without a write", async () => {
  expect(
    (
      await POST(
        new Request("https://test/api/crews/sessions", {
          method: "POST",
          body: JSON.stringify({ action: "rsvp", id, join: "false" }),
        }),
      )
    ).status,
  ).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});
it("passes only the session and caller intention to the authenticated RPC", async () => {
  rpc.mockResolvedValue({ error: null });
  const response = await POST(
    new Request("https://test/api/crews/sessions", {
      method: "POST",
      body: JSON.stringify({
        action: "rsvp",
        id,
        join: true,
        userId: "forged",
      }),
    }),
  );
  expect(response.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("set_crew_session_rsvp", {
    p_session_id: id,
    p_join: true,
  });
});
