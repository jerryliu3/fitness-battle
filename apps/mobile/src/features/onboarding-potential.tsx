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
    <AppText secondary>Stay consistent and see how your effort adds up over time.</AppText>
    <View style={panel}>
      <AppText role="label">Potential Effort Score</AppText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <AppText role="display">{start.toLocaleString("en-US")}</AppText>
        <AppText role="heading" secondary>→</AppText>
        <AppText role="display">{end.toLocaleString("en-US")}</AppText>
      </View>
      <StandardLineChart height={220} values={scores} xLabels={labels} pointLabels={pointLabels}
        showAxes showTrend={false} accessibilityLabel={`Potential score growth from ${start} to ${end} over seven weeks`} />
    </View>
    <View style={panel}>
      <AppText role="heading">Every session is part of the story.</AppText>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        {["Train", "Build effort", "New weekly field"].map((label, index) =>
          <View key={label} style={{ flex: 1, alignItems: "center", gap: 6 }}>
            <View style={{ width: 35, height: 35, borderRadius: 18, justifyContent: "center", alignItems: "center", backgroundColor: c.actionSoft }}>
              <AppText role="label">{index + 1}</AppText>
            </View>
            <AppText role="caption" style={{ textAlign: "center" }}>{label}</AppText>
          </View>)}
      </View>
      <AppText role="caption" secondary>Your long-term progress can grow even while weekly competitions start fresh.</AppText>
    </View>
    <AppText role="caption" secondary>Your progress depends on your activity. Every athlete starts from their own baseline.</AppText>
  </View>;
}
