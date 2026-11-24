import { formatCrewTargetLabel } from "./crew-passport";
import { SPORTS, type SportId } from "./compete/sports";

export const CREW_INVITE_ROSTER_PREVIEW_LIMIT = 8;

export type CrewInvitePreviewMember = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
};

export type CrewInvitePreviewPayload = {
  id: string;
  name: string;
  sport: SportId | string;
  format: string;
  target_sessions: number;
  journey_km: number;
  invite_code: string;
  member_count: number;
  members: CrewInvitePreviewMember[];
};

export function crewInviteSportName(sport: string): string {
  return SPORTS.find((item) => item.id === sport)?.name ?? sport;
}

export function crewInviteUsesSessionMetric(preview: Pick<CrewInvitePreviewPayload, "format" | "sport">): boolean {
  return preview.format === "personal_target" || preview.sport === "strength";
}

export function crewInviteTargetLabel(preview: Pick<CrewInvitePreviewPayload, "format" | "sport" | "target_sessions" | "journey_km">): string {
  return crewInviteUsesSessionMetric(preview)
    ? formatCrewTargetLabel(preview.target_sessions, "sessions")
    : formatCrewTargetLabel(preview.journey_km, "km");
}

export function crewInviteMemberCountLabel(count: number): string {
  return `${count} ${count === 1 ? "member" : "members"}`;
}

export function crewInviteRosterPreview(
  preview: CrewInvitePreviewPayload,
  limit = CREW_INVITE_ROSTER_PREVIEW_LIMIT,
): CrewInvitePreviewMember[] {
  return preview.members.slice(0, limit);
}

export function crewInviteExtraRosterCount(
  preview: CrewInvitePreviewPayload,
  limit = CREW_INVITE_ROSTER_PREVIEW_LIMIT,
): number {
  return Math.max(0, preview.member_count - limit);
}

export type CrewInviteOverviewMember = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  rest_week: string | null;
};

export function crewInviteOverviewMembers(preview: CrewInvitePreviewPayload): CrewInviteOverviewMember[] {
  return preview.members.map((member) => ({
    user_id: member.user_id,
    display_name: member.display_name,
    avatar_url: member.avatar_url,
    rest_week: null,
  }));
}

export const CREW_INVITE_PREVIEW_FOOTNOTE =
  "This is a preview. Accept to join and see live weekly progress with your crew.";

export function crewInvitePreviewErrorMessage(code?: string): string {
  return code === "invite_not_found"
    ? "We couldn't find a crew with that invite code."
    : "Could not load this invitation.";
}

export async function loadCrewInvitePreview(
  endpoint: string,
  code: string,
): Promise<CrewInvitePreviewPayload> {
  const base = endpoint.replace(/\/$/, "");
  const response = await fetch(`${base}?code=${encodeURIComponent(code)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(crewInvitePreviewErrorMessage(body?.error));
  }
  return response.json() as Promise<CrewInvitePreviewPayload>;
}

/** Map crew API / join error tokens to product copy. */
export function humanizeCrewApiError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("invite_not_found")) return crewInvitePreviewErrorMessage("invite_not_found");
  if (lower.includes("already_a_member")) return "You are already a member of this crew.";
  if (lower.includes("not_a_member")) return "You are not a member of this crew.";
  if (lower.includes("crew_not_found")) return "We couldn't find that crew.";
  if (lower.includes("name_required")) return "Please enter a crew name.";
  if (lower.includes("authentication_required")) return "Sign in to manage crews.";
  return raw;
}