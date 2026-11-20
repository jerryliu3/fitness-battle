import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: vi.fn() }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: vi.fn() }));
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";
import { GET } from "./route";

const editionId = "00000000-0000-4000-8000-000000000010";
const rpc = vi.fn();
const params = (id = editionId) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveRequestUserId).mockResolvedValue("athlete-1");
  vi.mocked(createRequestClient).mockResolvedValue({ rpc } as never);
});

it("requires auth and validates edition uuid", async () => {
  vi.mocked(resolveRequestUserId).mockResolvedValue(null);
  expect((await GET(new Request("https://test/api/special-events/x"), params())).status).toBe(401);
  vi.mocked(resolveRequestUserId).mockResolvedValue("athlete-1");
  expect((await GET(new Request("https://test/api/special-events/bad"), params("bad"))).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});

it("returns standings and maps authorization/pre-start errors cleanly", async () => {
  rpc.mockResolvedValueOnce({ data: { editionId, currentRound: 1, rounds: [] }, error: null });
  const ok = await GET(new Request(`https://test/api/special-events/${editionId}`), params());
  expect(ok.status).toBe(200);
  expect(ok.headers.get("Cache-Control")).toBe("private, no-store");
  expect(rpc).toHaveBeenCalledWith("special_event_standings", { p_edition_id: editionId });

  rpc.mockResolvedValueOnce({ data: null, error: { message: "not_registered" } });
  expect((await GET(new Request(`https://test/api/special-events/${editionId}`), params())).status).toBe(403);

  rpc.mockResolvedValueOnce({ data: null, error: { message: "edition_not_started" } });
  expect((await GET(new Request(`https://test/api/special-events/${editionId}`), params())).status).toBe(409);
});
