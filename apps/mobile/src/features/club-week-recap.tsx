import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  APP_TIMEZONE,
  clubDuration,
  clubWeekSummary,
  latestClubRecap,
  sportById,
  type CompeteState,
} from "@fitness-battle/shared";
import { f } from "../ui/focus";
import { SHELL_COLORS as c } from "../theme";
export function WeekRecap({ state }: { state: CompeteState }) {
  const router = useRouter(),
    week = clubWeekSummary(state),
    recap = latestClubRecap(state),
    difference = week.movingSec - week.previousSec;
  return (
    <View style={f.card}>
      <Text accessibilityRole="header" style={f.h2}>
        Your week, in perspective
      </Text>
      <View style={f.row}>
        {[
          { value: clubDuration(week.movingSec), label: "Active time" },
          { value: String(week.sessions), label: "Sessions" },
          { value: `${week.activeDays} / 7`, label: "Active days" },
        ].map((m) => (
          <View key={m.label} style={{ flex: 1, gap: 5 }}>
            <Text
              style={[
                f.rowTitle,
                { fontSize: 20, fontFamily: "DMSans_700Bold", lineHeight: 28 },
              ]}
            >
              {m.value}
            </Text>
            <Text style={f.small}>{m.label}</Text>
          </View>
        ))}
      </View>
      <Text style={f.small}>
        {week.previousSec
          ? `${difference >= 0 ? "+" : "−"}${clubDuration(Math.abs(difference))} compared with all of last week.`
          : "Each counted session builds your story."}
      </Text>
      {recap ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View latest week recap"
          onPress={() => router.push("/arena?results=latest")}
          style={s.receipt}
        >
          <View style={s.stamp}>
            <Text style={f.h2}>{recap.place}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={f.rowTitle}>Last week, well earned.</Text>
            <Text style={f.small}>
              {sportById(recap.sport).name} ·{" "}
              {new Date(recap.periodStart).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: APP_TIMEZONE,
              })}{" "}
              · Place {recap.place} of {recap.fieldSize}
            </Text>
            <Text style={f.small}>
              {recap.eloAfter - recap.eloBefore >= 0 ? "+" : ""}
              {recap.eloAfter - recap.eloBefore} Effort Score · View recap →
            </Text>
          </View>
        </Pressable>
      ) : (
        <Text style={f.small}>
          Your first settled competition recap will appear here.
        </Text>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  receipt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: c.line,
  },
  stamp: {
    width: 46,
    height: 54,
    borderRadius: 14,
    backgroundColor: c.actionSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
