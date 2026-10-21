import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: vi.fn() }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: vi.fn() }));
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";
import { GET, POST } from "./route";
const id = "00000000-0000-4000-8000-000000000001",
  rpc = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveRequestUserId).mockResolvedValue("athlete");
  vi.mocked(createRequestClient).mockResolvedValue({ rpc } as never);
});
it("requires a signed-in actor", async () => {
  vi.mocked(resolveRequestUserId).mockResolvedValue(null);
  expect(
    (await GET(new Request("https://test/api/compete/social"))).status,
  ).toBe(401);
  expect(
    (
      await POST(
        new Request("https://test/api/compete/social", {
          method: "POST",
          body: "{}",
        }),
      )
    ).status,
  ).toBe(401);
});
it("never forwards a forged actor or creates coupled choices", async () => {
  rpc.mockResolvedValue({ error: null });
  const response = await POST(
    new Request("https://test/api/compete/social", {
      method: "POST",
      body: JSON.stringify({
        fieldId: id,
        recipientId: id,
        track: "open",
        kind: "congrats",
        enabled: true,
        actorId: "forged",
        repeat: true,
      }),
    }),
  );
  expect(response.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("set_weekly_field_choice", {
    p_field_id: id,
    p_recipient_id: id,
    p_track: "open",
    p_kind: "congrats",
    p_enabled: true,
  });
});
it("reports authorization or settlement rejection as an unsaved choice", async () => {
  rpc.mockResolvedValue({ error: { message: "not_in_settled_field" } });
  const response = await POST(
    new Request("https://test/api/compete/social", {
      method: "POST",
      body: JSON.stringify({
        fieldId: id,
        recipientId: id,
        track: "open",
        kind: "repeat",
        enabled: true,
      }),
    }),
  );
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "choice_not_saved" });
});
