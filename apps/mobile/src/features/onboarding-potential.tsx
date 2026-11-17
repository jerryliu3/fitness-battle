import { ONBOARDING_GROWTH } from "@fitness-battle/shared";
import { View } from "react-native";
import { useThemeColors } from "../theme";
import { AppText } from "../ui/section";
import { StandardLineChart } from "../ui/standard-line-chart";

/** A sample trajectory, not an actual or predicted guest score. */
export function OnboardingPotential() {
  const c = useThemeColors();
  const { scores, labels, pointLabels } = ONBOARDING_GROWTH;
  const start = scores[0]!, end = scores[scores.length - 1]!;
  const panel = { backgroundColor: c.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: c.line, gap: 12 } as const;
  return <View style={{ gap: 18 }}>
    <View style={panel}>
      <AppText role="label">Effort Score</AppText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <AppText role="display">{start.toLocaleString("en-US")}</AppText>
        <AppText role="heading" secondary>→</AppText>
        <AppText role="display">{end.toLocaleString("en-US")}</AppText>
      </View>
      <StandardLineChart height={220} values={scores} xLabels={labels} pointLabels={pointLabels}
        showAxes showTrend={false} accessibilityLabel={`Potential score growth from ${start} to ${end} over seven weeks`} />
    </View>
    <AppText secondary>As you train, your athlete’s progress becomes visible through scores, records and trends.</AppText>
  </View>;
}
