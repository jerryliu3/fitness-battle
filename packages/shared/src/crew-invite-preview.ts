import { SPORTS, type SportId } from "./compete/sports";

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