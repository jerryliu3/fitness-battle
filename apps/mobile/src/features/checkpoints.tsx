import {
  competeNow,
  countsOnTrack,
  formatVolume,
  suggestionForState,
  type Activity,
  type CompeteState,
} from "@fitness-battle/shared";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

const mascot = require("../../assets/mascots/star-ember.png");

export function Checkpoints({
  state,
  onActivity,
  onToday,
}: {
  state: CompeteState;
  onActivity: (activity: Activity) => void;
  onToday: () => void;
}) {
  const now = competeNow(state);
  const suggestion = suggestionForState(state, now);
  const past = state.activities
    .filter(
      (activity) =>
        activity.sport === state.primary &&
        countsOnTrack(activity, "open") &&
        new Date(activity.startedAt) <= now,
    )
    .slice(-2);

  return (
    <View style={styles.route} accessibilityLabel="Winding activity checkpoints">
      {past.map((activity, index) => (
        <Pressable
          key={activity.id}
          accessibilityRole="button"
          onPress={() => onActivity(activity)}
          style={[styles.disc, styles.past, index % 2 === 0 ? styles.left : styles.right]}
        >
          <Text style={styles.check}>✓</Text>
          <Text style={styles.volume}>
            {formatVolume(state.primary, activity.distanceM, activity.movingSec)}
          </Text>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Today’s checkpoint"
        onPress={onToday}
        style={[styles.disc, styles.today, styles.center]}
      >
        <Image source={mascot} style={styles.mascot} accessibilityIgnoresInvertColors />
      </Pressable>
      <View style={styles.copy}>
        <Text style={styles.kicker}>Today</Text>
        <Text style={styles.title}>{suggestion.title}</Text>
        {suggestion.minutes != null ? (
          <Text style={styles.minutes}>{suggestion.minutes} min</Text>
        ) : null}
      </View>
      {[0, 1, 2].map((slot) => (
        <View
          key={slot}
          accessibilityLabel="Future checkpoint"
          style={[styles.disc, styles.future, slot % 2 === 0 ? styles.right : styles.left]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  route: { gap: 18, paddingVertical: 8 },
  disc: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  past: { backgroundColor: colors.plum },
  today: { backgroundColor: colors.tennis, width: 96, height: 96, borderRadius: 48 },
  future: { backgroundColor: "transparent", borderWidth: 2, borderStyle: "dashed", borderColor: colors.line },
  left: { alignSelf: "flex-start", marginLeft: 12 },
  right: { alignSelf: "flex-end", marginRight: 18 },
  center: { alignSelf: "center" },
  check: { color: colors.tennis, fontFamily: fonts.bodyBold, fontSize: 16 },
  volume: { color: colors.paper, fontFamily: fonts.bodyMedium, fontSize: 12 },
  mascot: { width: 72, height: 72 },
  copy: { alignItems: "center", gap: 2 },
  kicker: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 13, textTransform: "uppercase" },
  title: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 22, textAlign: "center" },
  minutes: { fontFamily: fonts.body, color: colors.muted, fontSize: 14 },
});
