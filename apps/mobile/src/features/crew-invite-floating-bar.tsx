import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MapHudBackdrop, useMapHud } from "../ui/map-hud";
import { AppText } from "../ui/section";
import { FocusButton } from "../ui/focus";

export function CrewInviteFloatingBar({
  busy,
  onAccept,
  onDecline,
}: {
  busy?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const insets = useSafeAreaInsets();
  const hud = useMapHud();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { top: Math.max(6, insets.top), left: 14, right: 14 }]}
      accessibilityRole="toolbar"
      accessibilityLabel="Crew invitation"
    >
      <View style={styles.shell}>
        <MapHudBackdrop radius={18} />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 18,
              borderWidth: 1,
              borderColor: hud.light ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.14)",
              backgroundColor: hud.light ? hud.surface?.backgroundColor : "rgba(20, 20, 19, 0.88)",
            },
          ]}
        />
        <View style={styles.row}>
          <AppText role="label" numberOfLines={1} style={styles.kicker}>
            Invite
          </AppText>
          <View style={styles.actions}>
            <FocusButton label="Decline" secondary fit onPress={onDecline} disabled={busy} />
            <FocusButton label={busy ? "Joining…" : "Accept"} fit onPress={onAccept} disabled={busy} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    zIndex: 40,
  },
  shell: {
    borderRadius: 18,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#142b3b",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  kicker: {
    flexShrink: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
});