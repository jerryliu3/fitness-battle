import { beforeEach, describe, expect, it, vi } from "vitest";

const stubs = vi.hoisted(() => ({
  from: vi.fn(),
  db: vi.fn(),
}));

vi.mock("@/lib/competition-authority", () => ({
  competitionAuthorityDatabase: () => stubs.db(),
}));

import { GET } from "./route";

describe("crew invite preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const crewQuery = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "crew-1",
          name: "Dawn Patrol",
          sport: "running",
          format: "cooperative",
          target_sessions: 4,
          journey_km: 40,
          invite_code: "rally7",
        },
        error: null,
      }),
    };
    const memberQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ user_id: "u1", display_name: "Alex" }],
        error: null,
      }),
    };
    const profilesQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ id: "u1", avatar_url: null }],
        error: null,
      }),
    };
    stubs.from
      .mockImplementationOnce(() => crewQuery)
      .mockImplementationOnce(() => memberQuery)
      .mockImplementationOnce(() => profilesQuery);
    stubs.db.mockReturnValue({ from: stubs.from });
  });

  it("returns public-safe crew preview for a valid invite code", async () => {
    const response = await GET(new Request("http://localhost/api/crews/invite-preview?code=RALLY7"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe("Dawn Patrol");
    expect(body.members).toHaveLength(1);
    expect(body.invite_code).toBe("rally7");
  });

  it("rejects malformed codes", async () => {
    const response = await GET(new Request("http://localhost/api/crews/invite-preview?code=ab"));
    expect(response.status).toBe(400);
  });
});