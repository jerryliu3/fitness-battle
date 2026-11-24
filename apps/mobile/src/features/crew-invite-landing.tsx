import type { CrewInvitePreviewPayload } from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { FocusButton, useFocusStyles } from "../ui/focus";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CrewInviteFloatingBar } from "./crew-invite-floating-bar";
import { CrewInvitePreview } from "./crew-invite-preview";

const FLOATING_BAR_CLEARANCE = 56;

export function CrewInviteLanding({
  inviteCode,
  loading,
  loadError,
  preview,
  joinBusy,
  joinError,
  onAccept,
  onDecline,
  onDismissError,
}: {
  inviteCode: string;
  loading: boolean;
  loadError: string | null;
  preview: CrewInvitePreviewPayload | null;
  joinBusy: boolean;
  joinError?: string | null;
  onAccept: () => void;
  onDecline: () => void;
  onDismissError: () => void;
}) {
  const f = useFocusStyles();
  const insets = useSafeAreaInsets();
  if (!inviteCode) return null;

  const barTop = Math.max(6, insets.top);
  const contentTop = preview ? barTop + FLOATING_BAR_CLEARANCE : 0;

  return (
    <View>
      {preview ? <CrewInviteFloatingBar busy={joinBusy} onAccept={onAccept} onDecline={onDecline} /> : null}
      {loading ? (
        <View style={{ paddingTop: contentTop, paddingHorizontal: 4 }}>
          <AppText role="body" secondary>
            Loading your invitation…
          </AppText>
        </View>
      ) : null}
      {loadError ? (
        <View style={[f.card, f.section, { marginTop: contentTop }]}>
          <AppText role="heading">Invitation unavailable</AppText>
          <AppText role="body" secondary>
            {loadError}
          </AppText>
          <FocusButton label="Dismiss" secondary onPress={onDismissError} />
        </View>
      ) : null}
      {preview ? (
        <CrewInvitePreview preview={preview} error={joinError} topInset={contentTop} />
      ) : null}
    </View>
  );
}