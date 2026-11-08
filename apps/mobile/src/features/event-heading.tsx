import { Pressable, View } from "react-native";
import { APP_TIMEZONE, competeNow, competePeriodWindow, competitionQueue, sportById, weeklyCompetitionLastDay, type CompeteState, type SportId } from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { AppIcon } from "../ui/app-icon";
import { useThemeColors } from "../theme";
import { CompeteIcon } from "./compete-home-sections";

export function EventHeading({ state, sport, onBack }: { state: CompeteState; sport: SportId; onBack(): void }) {
  const c = useThemeColors();
  const now = competeNow(state), period = competePeriodWindow(state, now, sport);
  const queue = competitionQueue(state, sport, now);
  const queued = queue?.queued || queue?.awaitingField;
  const dates: Intl.DateTimeFormatOptions = { timeZone: APP_TIMEZONE, month: "short", day: "numeric" };
  return <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back to events" onPress={onBack} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" }}><AppIcon name="back" /></Pressable>
    <View style={{ flex: 1, gap: 6 }}><AppText role="heading" accessibilityRole="header">Weekly {sportById(sport).name} Meet</AppText><AppText role="caption" secondary><AppText role="caption" style={{ color: queued ? c.muted : c.statusSuccess }}>{queued ? "Upcoming" : "● Live"}</AppText> · {period.startsAt.toLocaleDateString("en-US", dates)} – {weeklyCompetitionLastDay(period.endsAt).toLocaleDateString("en-US", dates)}</AppText></View>
    <View style={{ padding: 10, backgroundColor: c.actionSoft, borderRadius: 14 }}><CompeteIcon name={sport} /></View>
  </View>;
}
