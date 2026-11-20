import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: vi.fn() }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: vi.fn() }));
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";
import { GET, PUT } from "./route";

const editionId = "00000000-0000-4000-8000-000000000010";
const crewId = "00000000-0000-4000-8000-000000000020";
const userId = "00000000-0000-4000-8000-000000000030";
const rpc = vi.fn();
const params = (id = editionId) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveRequestUserId).mockResolvedValue("athlete-1");
  vi.mocked(createRequestClient).mockResolvedValue({ rpc } as never);
});

it("requires auth and validates ids and leg payloads", async () => {
  vi.mocked(resolveRequestUserId).mockResolvedValue(null);
  expect((await GET(new Request(`https://test/api/special-events/${editionId}/relay?crewId=${crewId}`), params())).status).toBe(401);
  vi.mocked(resolveRequestUserId).mockResolvedValue("athlete-1");
  expect((await GET(new Request(`https://test/api/special-events/${editionId}/relay?crewId=bad`), params())).status).toBe(400);
  expect((await PUT(new Request(`https://test/api/special-events/${editionId}/relay`, {
    method: "PUT",
    body: JSON.stringify({ crewId, legs: [{ legDay: "bad", slotIndex: 1, userId }] }),
  }), params())).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});

it("reads and saves crew relay legs and maps locked lineups to 409", async () => {
  rpc.mockResolvedValueOnce({ data: { editionId, crewId, legs: [] }, error: null });
  const got = await GET(new Request(`https://test/api/special-events/${editionId}/relay?crewId=${crewId}`), params());
  expect(got.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("special_event_relay_lineup", { p_edition_id: editionId, p_crew_id: crewId });

  rpc.mockResolvedValueOnce({ data: { sideId: "s1", saved: true }, error: null });
  const saved = await PUT(new Request(`https://test/api/special-events/${editionId}/relay`, {
    method: "PUT",
    body: JSON.stringify({ crewId, legs: [{ legDay: "2026-11-23", slotIndex: 1, userId }] }),
  }), params());
  expect(saved.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("set_special_event_relay_legs", {
    p_edition_id: editionId,
    p_crew_id: crewId,
    p_legs: [{ legDay: "2026-11-23", slotIndex: 1, userId }],
  });

  rpc.mockResolvedValueOnce({ data: null, error: { message: "relay_lineup_locked" } });
  const locked = await PUT(new Request(`https://test/api/special-events/${editionId}/relay`, {
    method: "PUT",
    body: JSON.stringify({ crewId, legs: [{ legDay: "2026-11-23", slotIndex: 1, userId }] }),
  }), params());
  expect(locked.status).toBe(409);
});
