import { GUEST_ENTRY_COPY } from "@fitness-battle/shared";
import { FocusButton, FocusSheet } from "../ui/focus";
import { AppText } from "../ui/section";
import { View } from "react-native";
import { useRouter } from "expo-router";

export function GuestEntrySheet({
  open,
  reason,
  nextPath,
  onClose,
}: {
  open: boolean;
  reason: string;
  nextPath: string;
  onClose: () => void;
}) {
  const router = useRouter();
  return (
    <FocusSheet
      open={open}
      title={GUEST_ENTRY_COPY.sheetTitle}
      body={GUEST_ENTRY_COPY.sheetBody}
      onClose={onClose}
    >
      <View style={{ gap: 14 }}>
        <AppText role="body">{reason}</AppText>
        <FocusButton
          label={GUEST_ENTRY_COPY.createAccount}
          onPress={() => router.push({ pathname: "/welcome", params: { next: nextPath } })}
        />
        <FocusButton
          label={GUEST_ENTRY_COPY.signIn}
          secondary
          onPress={() => router.push({ pathname: "/welcome", params: { next: nextPath } })}
        />
        <FocusButton label={GUEST_ENTRY_COPY.keepBrowsing} secondary onPress={onClose} />
      </View>
    </FocusSheet>
  );
}