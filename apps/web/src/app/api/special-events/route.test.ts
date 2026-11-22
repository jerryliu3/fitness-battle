import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: vi.fn() }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: vi.fn() }));
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";
import { GET, POST } from "./route";

const editionId = "00000000-0000-4000-8000-000000000010";
const crewId = "00000000-0000-4000-8000-000000000020";
const rpc = vi.fn();
const post = (body: unknown) =>
  POST(new Request("https://test/api/special-events", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveRequestUserId).mockResolvedValue("athlete-1");
  vi.mocked(createRequestClient).mockResolvedValue({ rpc } as never);
});

it("requires authentication for reads and writes", async () => {
  vi.mocked(resolveRequestUserId).mockResolvedValue(null);
  expect((await GET(new Request("https://test/api/special-events"))).status).toBe(401);
  expect((await post({ action: "register", editionId })).status).toBe(401);
  expect(rpc).not.toHaveBeenCalled();
});

it("lists published special events with private no-store cache", async () => {
  rpc.mockResolvedValue({ data: [{ id: editionId, title: "Daily Survivor" }], error: null });
  const response = await GET(new Request("https://test/api/special-events"));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect((await response.json()).editions).toHaveLength(1);
  expect(rpc).toHaveBeenCalledWith("list_special_events");
});

it("validates edition and crew ids before calling registration RPC", async () => {
  expect((await post({ action: "register", editionId: "bad" })).status).toBe(400);
  expect((await post({ action: "register", editionId, crewId: "bad" })).status).toBe(400);
  expect((await post({ action: "unknown", editionId })).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});

it("delegates registration and reports closed cutoffs as 409 conflicts", async () => {
  rpc.mockResolvedValueOnce({ data: { id: "entry-1", status: "registered" }, error: null });
  const ok = await post({ action: "register", editionId, crewId, groupValue: " US ", status: "active" });
  expect(ok.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("register_special_event", {
    p_edition_id: editionId,
    p_crew_id: crewId,
    p_group_value: "US",
  });

  rpc.mockResolvedValueOnce({ data: null, error: { message: "registration_closed" } });
  const closed = await post({ action: "cancel", editionId });
  expect(closed.status).toBe(409);
  expect((await closed.json()).error).toMatch(/full-week/);

  rpc.mockResolvedValueOnce({ data: { id: "entry-1", acknowledgedRound: 2 }, error: null });
  const ack = await post({ action: "acknowledge", editionId, roundNumber: 2 });
  expect(ack.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("acknowledge_special_event", {
    p_edition_id: editionId,
    p_round_number: 2,
  });
});
