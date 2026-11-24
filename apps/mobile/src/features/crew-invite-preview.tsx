import { View } from "react-native";
import { useThemeColors } from "../theme";
import {
  APP_TIMEZONE,
  crewInviteSportName,
  formatCrewTargetLabel,
  type CrewInvitePreviewPayload,
} from "@fitness-battle/shared";
import { RankAvatar } from "../ui/rank-symbol";
import { AppText } from "../ui/section";
import { FocusButton } from "../ui/focus";
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
  const colors = useThemeColors();
  const sessionsMetric = preview.format === "personal_target" || preview.sport === "strength";
  const targetLabel = sessionsMetric
    ? formatCrewTargetLabel(preview.target_sessions, "sessions")
    : formatCrewTargetLabel(preview.journey_km, "km");

  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: 12,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.line,
        }}
      >
        <AppText role="label">Invitation</AppText>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <FocusButton label="Decline" secondary onPress={onDecline} disabled={busy} />
          <FocusButton label={busy ? "Joining…" : "Accept"} onPress={onAccept} disabled={busy} />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <AppText role="caption" secondary>
          {crewInviteSportName(String(preview.sport))} crew
        </AppText>
        <AppText role="display">{preview.name}</AppText>
        <AppText role="body" secondary>
          {preview.member_count} {preview.member_count === 1 ? "member" : "members"} · Weekly {targetLabel}
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {preview.members.slice(0, 8).map((member) => (
            <RankAvatar key={member.user_id} src={member.avatar_url} name={member.display_name} size={40} />
          ))}
        </View>
        <AppText role="caption" secondary>
          Accept to join and see live weekly progress with this crew.
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
        members={preview.members.map((member) => ({
          user_id: member.user_id,
          display_name: member.display_name,
          avatar_url: member.avatar_url,
          rest_week: null,
        }))}
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