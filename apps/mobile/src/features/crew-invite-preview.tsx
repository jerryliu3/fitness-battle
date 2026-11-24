import { View } from "react-native";
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
import { UserAvatar } from "../ui/user-avatar";
import { AppText } from "../ui/section";
import { useFocusStyles } from "../ui/focus";
import { CrewOverview } from "./crew-overview";

export function CrewInvitePreview({
  preview,
  error,
  topInset = 0,
}: {
  preview: CrewInvitePreviewPayload;
  error?: string | null;
  topInset?: number;
}) {
  const f = useFocusStyles();
  const targetLabel = crewInviteTargetLabel(preview);
  const roster = crewInviteRosterPreview(preview);
  const extraCount = crewInviteExtraRosterCount(preview);

  return (
    <View style={[f.section, { paddingTop: topInset }]}>
      <View style={[f.card, { gap: 8, paddingVertical: 16, paddingHorizontal: 16 }]}>
        <AppText role="caption" secondary>
          {crewInviteSportName(String(preview.sport))} crew
        </AppText>
        <AppText role="heading">{preview.name}</AppText>
        <AppText role="body" secondary>
          {crewInviteMemberCountLabel(preview.member_count)} · Weekly {targetLabel}
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {roster.map((member) => (
            <UserAvatar key={member.user_id} src={member.avatar_url} name={member.display_name} size={36} />
          ))}
          {extraCount > 0 ? (
            <AppText role="caption" secondary>
              +{extraCount} more
            </AppText>
          ) : null}
        </View>
        <AppText role="caption" secondary>
          {CREW_INVITE_PREVIEW_FOOTNOTE}
        </AppText>
      </View>

      {error ? <AppText role="body">{error}</AppText> : null}

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
        now={new Date().toISOString()}
        displayTimeZone={APP_TIMEZONE}
        hiddenIds={[]}
        invitePreview
        onSelectMember={() => {}}
        onViewMembers={() => {}}
      />
    </View>
  );
}