import type { CrewInvitePreviewPayload } from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { FocusButton, useFocusStyles } from "../ui/focus";
import { View } from "react-native";
import { CrewInvitePreview } from "./crew-invite-preview";

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
  if (!inviteCode) return null;

  return (
    <>
      {loading ? (
        <AppText role="body" secondary>
          Loading your invitation…
        </AppText>
      ) : null}
      {loadError ? (
        <View style={[f.card, f.section]}>
          <AppText role="heading">Invitation unavailable</AppText>
          <AppText role="body" secondary>
            {loadError}
          </AppText>
          <FocusButton label="Dismiss" secondary onPress={onDismissError} />
        </View>
      ) : null}
      {preview ? (
        <CrewInvitePreview
          preview={preview}
          busy={joinBusy}
          error={joinError}
          onAccept={onAccept}
          onDecline={onDecline}
        />
      ) : null}
    </>
  );
}