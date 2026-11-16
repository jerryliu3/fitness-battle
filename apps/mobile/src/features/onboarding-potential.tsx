import { rankForElo, SPORTS, type SportId } from "@fitness-battle/shared";
import { View } from "react-native";
import { useThemeColors } from "../theme";
import { AppText } from "../ui/section";
import { StandardLineChart } from "../ui/standard-line-chart";

/** An explicitly hypothetical illustration, not a result or entitlement. */
export function OnboardingPotential({ sport }: { sport: SportId }) {
  const c = useThemeColors();
  const scores = [1000, 1020, 1050, 1110, 1160, 1210];
  const first = scores[0]!, last = scores[scores.length - 1]!;
  const sportName = SPORTS.find(s => s.id === sport)?.name ?? "Fitness";
  return <View style={{ gap: 18 }}>
    <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: c.line, gap: 12 }}>
      <AppText role="caption" secondary>{sportName.toUpperCase()} · EXAMPLE EFFORT SCORE</AppText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <AppText role="display">{first.toLocaleString()}</AppText>
        <AppText role="heading" secondary>→</AppText>
        <AppText role="display" style={{ color: c.fieldTeal ?? c.ink }}>{last.toLocaleString()}</AppText>
      </View>
      <AppText role="body" secondary>See how consistent training and competition results could build your score over time.</AppText>
      <StandardLineChart height={166} values={scores} xLabels={["Start", "Week 3", "Week 6"]} showAxes showTrend={false}
        accessibilityLabel={`Illustrative ${sportName.toLowerCase()} effort score increases from ${first} to ${last}`} />
    </View>
    <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: c.line, gap: 12 }}>
      <AppText role="label">Potential rank progression</AppText>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <AppText role="heading">{rankForElo(first).name}</AppText>
        <AppText role="heading" secondary>→</AppText>
        <AppText role="heading">{rankForElo(last).name}</AppText>
      </View>
    </View>
    <AppText role="caption" secondary>Illustrative only. This is not an earned score, rank, reward, or promise of future results.</AppText>
  </View>;
}
