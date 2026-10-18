import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshState, reduceCompete } from "@fitness-battle/shared";
import { hydrateFieldBoard } from "@/lib/compete-persist";

const stubs = vi.hoisted(() => ({ user: vi.fn(), client: vi.fn() }));
vi.mock("@/lib/auth/request-user", () => ({ resolveRequestUserId: stubs.user }));
vi.mock("@/lib/supabase/request", () => ({ createRequestClient: stubs.client }));
import { GET, POST } from "./route";

const start = "2026-10-19T04:00:00.000Z";
const end = "2026-10-26T04:00:00.000Z";
const field = {
  id: "field-crew",
  crew_id: "crew-1",
  name: "Morning crew",
  sport: "running",
  wave_start: start,
  week_end: end,
  capacity: 8,
  member_ids: ["athlete-a", "athlete-b"],
  synthetic_ids: ["1", "2", "3", "4", "5", "6"],
};

function database() {
  const rpc = vi.fn(async (name: string): Promise<{
    data: unknown;
    error: { message: string } | null;
  }> => {
    if (name === "seat_athlete_week_field") return { data: field, error: null };
    if (name === "crew_field_roster") {
      return {
        data: field.member_ids.map((id) => ({ user_id: id, display_name: id, open_elo: 1000 })),
        error: null,
      };
    }
    if (name === "week_field_roster") {
      return {
        data: [
          { user_id: "athlete-a", display_name: "A", open_elo: 1000, distance_m: 0, moving_sec: 0 },
          { user_id: "athlete-b", display_name: "B", open_elo: 1050, distance_m: 4200, moving_sec: 1500 },
        ],
        error: null,
      };
    }
    throw new Error(`Unexpected RPC: ${name}`);
  });
  const from = vi.fn((table: string) => {
    const result = table === "crew_members"
      ? { crews: { id: "crew-1", name: "Morning crew", sport: "running" } }
      : table === "week_fields" ? field : undefined;
    if (!result) throw new Error(`Unexpected table: ${table}`);
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: result, error: null })),
    };
    return query;
  });
  return { rpc, from };
}

describe("canonical crew field", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubs.user.mockResolvedValue("athlete-a");
  });

  it("reads identical seating/scores on refresh and account hydration without reseating", async () => {
    const db = database();
    stubs.client.mockResolvedValue(db);
    const request = new Request("http://localhost/api/crews/field?crewId=crew-1", {
      headers: { Authorization: "Bearer mobile-token" },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    const { fields } = await response.json();
    const joined = reduceCompete(freshState(new Date(start)), {
      type: "opt-in", sport: "running", now: start,
    });
    joined.enrollments[0]!.crewId = "crew-1";
    const hydrated = await hydrateFieldBoard(db as never, "athlete-a", joined);
    expect(hydrated.crewBoard).toEqual(fields[0].pin);
    expect(hydrated.crewBoard?.members[1]?.distanceM).toBe(4200);
    expect(hydrated.crewBoard?.members[0]?.distanceM).toBe(0);
    expect(hydrated.enrollments[0]?.peerIds).toEqual(["athlete-b"]);
    expect(hydrated.enrollments[0]?.syntheticIds).toEqual(field.synthetic_ids);
    expect(db.rpc.mock.calls.map(([name]) => name)).toEqual([
      "week_field_roster", "week_field_roster",
    ]);
    expect(stubs.client).toHaveBeenCalledWith(request);
  });

  it("writes only the canonical seating RPC and returns its stored roster", async () => {
    const db = database();
    stubs.client.mockResolvedValue(db);
    const response = await POST(new Request("http://localhost/api/crews/field", {
      method: "POST",
      body: JSON.stringify({ crewId: "crew-1" }),
    }));
    expect(response.status).toBe(200);
    const { pin } = await response.json();
    expect(pin.memberIds).toEqual(field.member_ids);
    expect(pin.waveStart).toBe(field.wave_start);
    expect(db.rpc.mock.calls.map(([name]) => name)).toEqual([
      "crew_field_roster", "seat_athlete_week_field", "week_field_roster",
    ]);
  });

  it("does not report success if canonical seating fails", async () => {
    const db = database();
    db.rpc.mockImplementationOnce(async () => ({
      data: [{ user_id: "athlete-a", display_name: "A", open_elo: 1000 }], error: null,
    }));
    db.rpc.mockImplementationOnce(async () => ({ data: null, error: { message: "not_a_crew_member" } }));
    stubs.client.mockResolvedValue(db);
    const response = await POST(new Request("http://localhost/api/crews/field", {
      method: "POST", body: JSON.stringify({ crewId: "crew-1" }),
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "not_a_crew_member" });
    expect(db.rpc).toHaveBeenCalledTimes(2);
  });

  it("surfaces roster failures instead of inventing a zero-score field", async () => {
    const db = database();
    db.rpc.mockResolvedValueOnce({ data: null, error: { message: "unavailable" } });
    stubs.client.mockResolvedValue(db);
    const response = await GET(new Request("http://localhost/api/crews/field?crewId=crew-1"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "field_unavailable" });
  });

  it("requires authentication before touching the database", async () => {
    stubs.user.mockResolvedValue(null);
    const request = new Request("http://localhost/api/crews/field");
    expect((await GET(request)).status).toBe(401);
    expect((await POST(request)).status).toBe(401);
    expect(stubs.client).not.toHaveBeenCalled();
  });
});
