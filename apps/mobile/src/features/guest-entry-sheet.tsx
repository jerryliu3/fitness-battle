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
    <FocusSheet open={open} title="Join in" onClose={onClose}>
      <View style={{ gap: 14 }}>
        <AppText role="body">{reason}</AppText>
        <FocusButton
          label="Create account"
          onPress={() => router.push({ pathname: "/welcome", params: { next: nextPath } })}
        />
        <FocusButton
          label="Sign in"
          secondary
          onPress={() => router.push({ pathname: "/welcome", params: { next: nextPath } })}
        />
        <FocusButton label="Keep browsing" secondary onPress={onClose} />
      </View>
    </FocusSheet>
  );
}