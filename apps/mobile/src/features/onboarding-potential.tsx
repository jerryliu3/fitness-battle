import { ONBOARDING_GROWTH } from "@fitness-battle/shared";
import { View } from "react-native";
import { useThemeColors } from "../theme";
import { AppText } from "../ui/section";
import { RankSymbol } from "../ui/rank-symbol";
import { StandardLineChart } from "../ui/standard-line-chart";

export function OnboardingPotential() {
  const c = useThemeColors();
  const { scores, labels, pointLabels, from, to } = ONBOARDING_GROWTH;
  const start = scores[0]!, end = scores[scores.length - 1]!;
  const panel = { backgroundColor: c.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: c.line, gap: 12 };
  return <View style={{ gap: 18 }}>
    <View style={panel}>
      <AppText role="label">Potential Effort Score</AppText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <AppText role="display">{start.toLocaleString("en-US")}</AppText><AppText role="heading" secondary>→</AppText>
        <AppText role="display">{end.toLocaleString("en-US")}</AppText>
      </View>
      <StandardLineChart height={166} values={scores} xLabels={labels} pointLabels={pointLabels} yAxisLabel="Effort Score" xAxisLabel="Week" showAxes showTrend={false}
        accessibilityLabel={`Potential Effort Score growth from ${start} to ${end} over six weeks`} />
    </View>
    <View style={panel}>
      <AppText role="label">Potential rank progression</AppText>
      <View style={{ flexDirection: "row", justifyContent: "space-around", alignItems: "center", gap: 10 }}>
        <View style={{ alignItems: "center" }}><RankSymbol rank={from.id} size={72} decorative /><AppText role="label">{from.name}</AppText></View>
        <AppText role="heading" secondary>→</AppText>
        <View style={{ alignItems: "center" }}><RankSymbol rank={to.id} size={72} decorative /><AppText role="label">{to.name}</AppText></View>
      </View>
    </View>
    <AppText role="caption" secondary>Your training shapes your score. Rank changes are confirmed at your weekly recap.</AppText>
  </View>;
}
