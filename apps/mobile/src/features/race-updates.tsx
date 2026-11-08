import { Pressable, View } from "react-native";
import { APP_TIMEZONE, type CompeteState, type SportId } from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { useThemeColors } from "../theme";
import { AppIcon } from "../ui/app-icon";
import { useEventActivity } from "./use-event-activity";

export function RaceUpdates({ state, sport, active }: { state: CompeteState; sport: SportId; active: boolean }) {
  const c = useThemeColors();
  const { rows, loading, error, scope, retry } = useEventActivity(state, sport, active);
  if (!active) return null;
  return <View style={{ gap: 14 }}>
    {error ? <View style={{ gap: 8 }}><AppText role="caption" accessibilityLiveRegion="polite">{error}</AppText><Pressable accessibilityRole="button" onPress={() => retry()} style={{ minHeight: 44, justifyContent: "center" }}><AppText role="label">Retry</AppText></Pressable></View> : loading ? <AppText role="caption" secondary>Loading race updates…</AppText> : <>
      {!rows.length && <AppText secondary>No counted activity in this wave yet.</AppText>}
      <View style={{ borderRadius: 20, backgroundColor: c.card, overflow: "hidden" }}>{rows.map((row, i) => <View key={row.id} style={{ padding: 16, flexDirection: "row", gap: 12, borderTopWidth: i ? 1 : 0, borderColor: c.line }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: row.movement ? c.actionSoft : c.soft }}><AppIcon name={row.movement ? "progress" : sport} size={22} /></View>
        <View style={{ flex: 1, gap: 4 }}><AppText role="label">{row.title}</AppText><AppText role="caption" secondary>{row.detail}{row.simulated ? " · Simulated" : ""}</AppText><AppText role="caption" secondary>{new Date(row.at).toLocaleString("en-US", { timeZone: APP_TIMEZONE, weekday: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</AppText></View>
      </View>)}</View>
      <AppText role="caption" secondary>{scope === "local" ? "Local preview · includes simulated activity." : "Workout order from current counted activities."}</AppText>
    </>}
  </View>;
}
