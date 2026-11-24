"use client";

import { UserAvatar } from "@/ui/user-avatar";
import { AppHeading, AppParagraph, AppText } from "@/ui/section";
import {
  APP_TIMEZONE,
  crewInviteExtraRosterCount,
  crewInviteMemberCountLabel,
  crewInviteOverviewMembers,
  crewInviteRosterPreview,
  crewInviteSportName,
  crewInviteTargetLabel,
  CREW_INVITE_PREVIEW_FOOTNOTE,
  type CrewInvitePreviewPayload,
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
  const targetLabel = crewInviteTargetLabel(preview);
  const roster = crewInviteRosterPreview(preview);
  const extraCount = crewInviteExtraRosterCount(preview);

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

      <section className="crew-invite-hero">
        <AppParagraph typographyRole="label" className="fb-kicker">
          {crewInviteSportName(String(preview.sport))} crew
        </AppParagraph>
        <AppHeading level={1} role="display" className="crew-invite-hero-name">
          {preview.name}
        </AppHeading>
        <AppParagraph typographyRole="body" className="fb-copy crew-invite-hero-meta">
          {crewInviteMemberCountLabel(preview.member_count)} · Weekly {targetLabel}
        </AppParagraph>
        <div className="crew-invite-member-row">
          {roster.map((member) => (
            <UserAvatar
              key={member.user_id}
              src={member.avatar_url}
              name={member.display_name}
              size={40}
            />
          ))}
          {extraCount > 0 ? (
            <AppText role="caption" secondary>
              +{extraCount} more
            </AppText>
          ) : null}
        </div>
        <AppParagraph typographyRole="caption" className="fb-note crew-invite-hero-footnote">
          {CREW_INVITE_PREVIEW_FOOTNOTE}
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
        members={crewInviteOverviewMembers(preview)}
        entries={[]}
        units="us"
        now={now}
        displayTimeZone={APP_TIMEZONE}
        invitePreview
        onSelectMember={() => {}}
        onViewMembers={() => {}}
      />
    </div>
  );
}