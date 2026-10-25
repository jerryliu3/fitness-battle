import { Section, AppText } from "../ui/section";
import { Pressable, StyleSheet, View } from "react-native";
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
    <Section  title="Your week, in perspective">

      <View style={f.row}>
        {[
          { value: clubDuration(week.movingSec), label: "Active time" },
          { value: String(week.sessions), label: "Sessions" },
          { value: `${week.activeDays} / 7`, label: "Active days" },
        ].map((m) => (
          <View key={m.label} style={{ flex: 1, gap: 5 }}>
            <AppText role="metric"

            >
              {m.value}
            </AppText>
            <AppText role="caption" secondary >{m.label}</AppText>
          </View>
        ))}
      </View>
      <AppText role="caption" secondary >
        {week.previousSec
          ? `${difference >= 0 ? "+" : "−"}${clubDuration(Math.abs(difference))} compared with all of last week.`
          : "Each session builds your story."}
      </AppText>
      {recap ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View latest week recap. ${sportById(recap.sport).name}, ${recap.track === "verified" ? "GPS" : "Open"}. Place ${recap.place} of ${recap.fieldSize}. ${recap.eloAfter - recap.eloBefore >= 0 ? "+" : ""}${recap.eloAfter - recap.eloBefore} Effort Score.`}
          onPress={() => router.push("/arena?results=latest")}
          style={s.receipt}
        >
          <View style={s.stamp}>
            <AppText role="metric" >{recap.place}</AppText>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText role="row" >Your latest settled week.</AppText>
            <AppText role="support" secondary >
              {sportById(recap.sport).name} · {recap.track === "verified" ? "GPS" : "Open"} ·{" "}
              {new Date(recap.periodStart).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: APP_TIMEZONE,
              })}{" "}
              · Place {recap.place} of {recap.fieldSize}
            </AppText>
            <AppText role="support" secondary >
              {recap.eloAfter - recap.eloBefore >= 0 ? "+" : ""}
              {recap.eloAfter - recap.eloBefore} Effort Score · View recap →
            </AppText>
          </View>
        </Pressable>
      ) : (
        <AppText role="caption" secondary >
          Your first settled competition recap will appear here.
        </AppText>
      )}
    </Section>
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
