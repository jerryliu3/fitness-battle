"use client";

import { UserAvatar } from "@/ui/user-avatar";
import { AppHeading, AppParagraph, AppText } from "@/ui/section";
import {
  APP_TIMEZONE,
  crewInviteSportName,
  formatCrewTargetLabel,
  type CrewInvitePreviewPayload,
  type SportId,
} from "@fitness-battle/shared";
import { CrewOverview } from "./crew-overview";
import "./crew-invite-preview.css";

interface CrewInvitePreviewProps {
  preview: CrewInvitePreviewPayload;
  busy?: boolean;
  error?: string | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function CrewInvitePreview({
  preview,
  busy,
  error,
  onAccept,
  onDecline,
}: CrewInvitePreviewProps) {
  const now = new Date().toISOString();
  const sport = preview.sport as SportId;
  const sessionsMetric = preview.format === "personal_target" || preview.sport === "strength";
  const targetLabel = sessionsMetric
    ? formatCrewTargetLabel(preview.target_sessions, "sessions")
    : formatCrewTargetLabel(preview.journey_km, "km");

  return (
    <div className="crew-invite-preview">
      <div className="crew-invite-bar" role="region" aria-label="Crew invitation">
        <AppText role="label" className="crew-invite-bar-kicker">
          Invitation
        </AppText>
        <div className="crew-invite-bar-actions">
          <button type="button" className="fb-btn-line" disabled={busy} onClick={onDecline}>
            Decline
          </button>
          <button type="button" className="fb-btn" disabled={busy} onClick={onAccept}>
            {busy ? "Joining…" : "Accept invite"}
          </button>
        </div>
      </div>

      <section className="focus-card" style={{ marginBottom: 16 }}>
        <AppParagraph typographyRole="label" className="fb-kicker">
          {crewInviteSportName(String(preview.sport))} crew
        </AppParagraph>
        <AppHeading level={1} role="display">
          {preview.name}
        </AppHeading>
        <AppParagraph typographyRole="body" className="fb-copy" style={{ marginTop: 8 }}>
          {preview.member_count} {preview.member_count === 1 ? "member" : "members"} · Weekly {targetLabel}
        </AppParagraph>
        <div className="crew-invite-member-row">
          {preview.members.slice(0, 8).map((member) => (
            <UserAvatar
              key={member.user_id}
              src={member.avatar_url}
              name={member.display_name}
              size={40}
            />
          ))}
          {preview.member_count > 8 ? (
            <AppText role="caption" secondary>
              +{preview.member_count - 8} more
            </AppText>
          ) : null}
        </div>
        <AppParagraph typographyRole="caption" className="fb-note" style={{ marginTop: 12 }}>
          This is a preview. Accept to join and see live weekly progress with your crew.
        </AppParagraph>
      </section>

      {error ? (
        <AppParagraph typographyRole="caption" className="fb-error" role="alert">
          {error}
        </AppParagraph>
      ) : null}

      <CrewOverview
        crewId={preview.id}
        crewName={preview.name}
        sport={preview.sport}
        format={preview.format}
        targetSessions={preview.target_sessions}
        targetDistanceM={preview.journey_km * 1000}
        members={preview.members.map((member) => ({
          user_id: member.user_id,
          display_name: member.display_name,
          avatar_url: member.avatar_url,
          rest_week: null,
        }))}
        entries={[]}
        units="us"
        now={now}
        displayTimeZone={APP_TIMEZONE}
        onSelectMember={() => {}}
        onViewMembers={() => {}}
      />
    </div>
  );
}