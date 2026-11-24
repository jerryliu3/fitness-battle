import { describe, expect, it } from "vitest";
import {
  crewInviteMemberCountLabel,
  crewInviteOverviewMembers,
  crewInvitePreviewErrorMessage,
  crewInviteRosterPreview,
  crewInviteTargetLabel,
  CREW_INVITE_ROSTER_PREVIEW_LIMIT,
} from "./crew-invite-preview";
import type { CrewInvitePreviewPayload } from "./crew-invite-preview";

const basePreview = (): CrewInvitePreviewPayload => ({
  id: "c1",
  name: "Dawn Patrol",
  sport: "running",
  format: "cooperative",
  target_sessions: 5,
  journey_km: 40,
  invite_code: "ABCD",
  member_count: 3,
  members: [
    { user_id: "u1", display_name: "Alex", avatar_url: null },
    { user_id: "u2", display_name: "Sam", avatar_url: "https://x/a.png" },
    { user_id: "u3", display_name: "Jordan", avatar_url: null },
  ],
});

describe("crewInviteTargetLabel", () => {
  it("uses km for cooperative running crews", () => {
    expect(crewInviteTargetLabel(basePreview())).toBe("40 km");
  });

  it("uses sessions for strength crews", () => {
    expect(crewInviteTargetLabel({ ...basePreview(), sport: "strength" })).toBe("5 sessions");
  });
});

describe("crewInviteMemberCountLabel", () => {
  it("pluralizes member count", () => {
    expect(crewInviteMemberCountLabel(1)).toBe("1 member");
    expect(crewInviteMemberCountLabel(2)).toBe("2 members");
  });
});

describe("crewInviteRosterPreview", () => {
  it("caps roster at default limit", () => {
    const members = Array.from({ length: CREW_INVITE_ROSTER_PREVIEW_LIMIT + 2 }, (_, i) => ({
      user_id: `u${i}`,
      display_name: `User ${i}`,
      avatar_url: null,
    }));
    const preview = { ...basePreview(), member_count: members.length, members };
    expect(crewInviteRosterPreview(preview)).toHaveLength(CREW_INVITE_ROSTER_PREVIEW_LIMIT);
  });
});

describe("crewInviteOverviewMembers", () => {
  it("maps roster with null rest_week", () => {
    const mapped = crewInviteOverviewMembers(basePreview());
    expect(mapped).toHaveLength(3);
    expect(mapped[0].rest_week).toBeNull();
  });
});

describe("crewInvitePreviewErrorMessage", () => {
  it("maps invite_not_found", () => {
    expect(crewInvitePreviewErrorMessage("invite_not_found")).toMatch(/couldn't find/i);
  });
});