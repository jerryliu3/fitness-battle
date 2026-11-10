import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { raceClock, raceEditionChart, type RaceEditionAnalytics } from "@fitness-battle/shared";
import { AppText } from "./section";
import { FocusButton } from "./focus";
import { useThemeColors } from "../theme";

export function EditionAnalytics({ analytics, scope="edition" }: { analytics: RaceEditionAnalytics; scope?:"edition"|"distance" }) {
  const colors = useThemeColors();
  const router = useRouter();
  const [showValues, setShowValues] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const bins = raceEditionChart(analytics);
  const active = selected === null ? null : bins[selected];
  return <View style={{gap:16,paddingVertical:24,borderTopWidth:1,borderBottomWidth:1,borderColor:colors.line}}>
    <AppText role="heading">{scope==="edition" ? "Inside this race" : "Across this distance"}</AppText>
    <AppText role="caption" secondary>{analytics.total.toLocaleString()} published finishes across {analytics.editionCount ?? 1} {analytics.editionCount===1 ? "race edition" : "race editions"} in the selected category and timeframe. Athlete search does not change this field.</AppText>
    <View style={{flexDirection:"row",flexWrap:"wrap",gap:20}}>{([["Fastest finish",analytics.fastestMs],["Median finish",analytics.medianMs],["Slowest finish",analytics.slowestMs]] as const).map(([label,time]) => <View key={label} style={{gap:6}}><AppText role="caption" secondary>{label}</AppText><AppText role="heading" style={{fontVariant:["tabular-nums"]}}>{raceClock(time)}</AppText></View>)}</View>
    <View style={{height:160,flexDirection:"row",gap:2}}>{bins.map(bin => <Pressable key={bin.bucket} accessibilityRole="button" accessibilityState={{selected:selected===bin.bucket}} accessibilityLabel={`${bin.label}: ${bin.count.toLocaleString()} finishes`} onPress={() => setSelected(bin.bucket)} style={{flex:1,justifyContent:"flex-end"}}><View style={{height:`${bin.height}%`,backgroundColor:selected===bin.bucket ? colors.tennis : colors.muted,borderTopLeftRadius:3,borderTopRightRadius:3}} /></Pressable>)}</View>
    <View style={{flexDirection:"row",justifyContent:"space-between"}}><AppText role="caption" secondary>{raceClock(analytics.minimumMs)}</AppText><AppText role="caption" secondary>{raceClock(analytics.minimumMs+bins.length*analytics.binWidthMs)}</AppText></View>
    <AppText role="caption" accessibilityLiveRegion="polite">{active ? `${active.label} · ${active.count.toLocaleString()} finishes` : "Select a bar to inspect its finish-time range."}</AppText>
    <AppText role="caption" secondary>{analytics.chipCount.toLocaleString()} chip times · {analytics.officialCount.toLocaleString()} official times. Each finish is counted, so an athlete may appear more than once. Times are not adjusted for course or conditions.</AppText>
    <FocusButton label={showValues ? "Hide distribution values" : "View distribution values"} secondary onPress={() => setShowValues(value => !value)} />
    {showValues && bins.map(bin => <AppText key={bin.bucket} role="caption">{bin.label} · {bin.count.toLocaleString()} finishes</AppText>)}
    <FocusButton label="Check coverage" secondary onPress={() => router.push("/race-coverage")} />
  </View>;
}
