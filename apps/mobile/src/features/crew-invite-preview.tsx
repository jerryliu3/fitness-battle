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
import { RankAvatar } from "../ui/rank-symbol";
import { AppText } from "../ui/section";
import { FocusButton, useFocusStyles } from "../ui/focus";
import { CrewOverview } from "./crew-overview";

export function CrewInvitePreview({
  preview,
  busy,
  error,
  onAccept,
  onDecline,
}: {
  preview: CrewInvitePreviewPayload;
  busy?: boolean;
  error?: string | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const f = useFocusStyles();
  const targetLabel = crewInviteTargetLabel(preview);
  const roster = crewInviteRosterPreview(preview);
  const extraCount = crewInviteExtraRosterCount(preview);

  return (
    <View style={f.section}>
      <View style={[f.card, f.row, { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16 }]}>
        <AppText role="label">Invitation</AppText>
        <View style={{ flexDirection: "row", gap: 8, flexShrink: 0 }}>
          <FocusButton label="Decline" secondary onPress={onDecline} disabled={busy} />
          <FocusButton label={busy ? "Joining…" : "Accept"} onPress={onAccept} disabled={busy} />
        </View>
      </View>

      <View style={[f.card, { gap: 10 }]}>
        <AppText role="caption" secondary>
          {crewInviteSportName(String(preview.sport))} crew
        </AppText>
        <AppText role="display">{preview.name}</AppText>
        <AppText role="body" secondary>
          {crewInviteMemberCountLabel(preview.member_count)} · Weekly {targetLabel}
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {roster.map((member) => (
            <RankAvatar key={member.user_id} src={member.avatar_url} name={member.display_name} size={40} />
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
        onSelectMember={() => {}}
        onViewMembers={() => {}}
      />
    </View>
  );
}