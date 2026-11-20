import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  competeNow,
  specialEventFormatLabel,
  specialEventPhase,
  specialEventStatusBadge,
  type CompeteState,
  type SpecialEventEdition,
} from "@fitness-battle/shared";
import { useThemeColors } from "../theme";
import { AppText } from "../ui/section";
import { AppIcon } from "../ui/app-icon";
import { CoursePreview } from "./event-home";
import { CompeteIcon } from "./compete-home-sections";
import { SpecialEventRegistrationSheet } from "./special-event-sheet";

export function SpecialEventFullscreen({
  state,
  edition,
  busy,
  error,
  onCancel,
  onClose,
}: {
  state: CompeteState;
  edition: SpecialEventEdition;
  busy: boolean;
  error?: string;
  onCancel(): void;
  onClose(): void;
}) {
  const c = useThemeColors();
  const now = competeNow(state);
  const phase = specialEventPhase(edition, now);
  const status = specialEventStatusBadge(edition, now);

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={["top", "bottom"]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor: c.line,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Compete"
            onPress={() => { if (!busy) onClose(); }}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingRight: 8 }}
          >
            <View style={{ transform: [{ rotate: "180deg" }] }}>
              <AppIcon name="chevron" size={20} />
            </View>
            <AppText role="label">Back</AppText>
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText role="label" numberOfLines={1}>{edition.title}</AppText>
            <AppText role="caption" secondary numberOfLines={1}>
              {specialEventFormatLabel(edition.config)} · {status}
            </AppText>
          </View>
          <CompeteIcon name={edition.sport} size={22} gold />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          <CoursePreview state={state} sport={edition.sport} queued={phase !== "active"} />
          <SpecialEventRegistrationSheet
            state={state}
            edition={edition}
            busy={busy}
            error={error}
            fullscreen
            onRegister={() => {}}
            onCancel={onCancel}
            onClose={onClose}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
