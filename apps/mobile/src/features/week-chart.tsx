import { useState } from "react";
import { homeTrainingLine, type CompeteState } from "@fitness-battle/shared";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../ui/section";
import { OpenLineChart } from "../ui/open-line-chart";
import { ChartFrame } from "../ui/chart-frame";
import { HomeActivityActions } from "./home-activity-actions";

export function WeekChart({ state, onOpen, ready = true }: { state: CompeteState; onOpen?: () => void; ready?: boolean }) {
  const [range, setRange] = useState<"week" | "fourWeeks">("week");
  const chart = homeTrainingLine(state, range);
  return <ChartFrame ready={ready}><View style={s.card}>
    <View style={s.header}><AppText role="display" accessibilityRole="header">Your effort</AppText><HomeActivityActions compact /></View>
    <OpenLineChart chart={chart} label="Cumulative training hours" unit="hrs" range={range} onRangeChange={next => { if (next !== "year") setRange(next); }} includeYear={false} live footerAction={onOpen ? <Pressable accessibilityRole="button" onPress={onOpen} style={s.open}><AppText role="label">View week →</AppText></Pressable> : undefined} comparisonLabel={range === "week" ? "Last week" : "Prior 4 weeks"} />

  </View></ChartFrame>;
}
const s = StyleSheet.create({
  card: { paddingTop: 12, paddingBottom: 2, gap: 12 },
  header: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 },
  open: { minHeight: 44, justifyContent: "center", alignSelf: "flex-end" },
});
