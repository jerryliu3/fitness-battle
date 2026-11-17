import { OnboardingPotential } from "./onboarding-potential";
import { Pressable, View } from "react-native";
import Svg, { Circle, G, Line, Path } from "react-native-svg";
import { ONBOARDING_FEATURES, type SportId, type OnboardingFeatureId } from "@fitness-battle/shared";
import { useThemeColors } from "../theme";
import { AppText } from "../ui/section";

const names = ["Alex", "You", "Sam"] as const;

export function OnboardingFeatureTour({ sport, selected, onSelect }: { sport: SportId; selected: OnboardingFeatureId; onSelect: (id: OnboardingFeatureId) => void }) {
  const c = useThemeColors();
  const feature = ONBOARDING_FEATURES.find(item => item.id === selected)!;
  const goal = sport === "cycling" ? ["Ride 150 km together", "108 / 150 km"] : sport === "walking" ? ["Walk 120,000 steps together", "86,400 / 120,000 steps"] : sport === "strength" ? ["Train 360 minutes together", "259 / 360 min"] : ["Move 40 km together", "28.8 / 40 km"];
  const card = { borderRadius: 18, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, padding: 18, gap: 14 } as const;
  const tab = (active: boolean) => ({
    flex: 1, minHeight: 44, alignItems: "center" as const, justifyContent: "center" as const,
    borderRadius: 12, backgroundColor: active ? c.actionSoft : c.card,
    borderWidth: 1, borderColor: active ? c.ink : c.line, paddingHorizontal: 6,
  });
  return <View style={{ gap: 16 }}>
    <View style={{ flexDirection: "row", gap: 7 }}>
      {ONBOARDING_FEATURES.map(item => <Pressable key={item.id} accessibilityRole="button"
        accessibilityLabel={item.label} accessibilityState={{ selected: item.id === selected }}
        onPress={() => onSelect(item.id)} style={tab(item.id === selected)}>
        <AppText role="caption" style={{ textAlign: "center" }}>{item.label}</AppText>
      </Pressable>)}
    </View>
    {selected === "growth" ? <OnboardingPotential /> : <>
      <AppText role="heading" accessibilityRole="header">{feature.title}</AppText>
      <AppText secondary>{feature.description}</AppText>
    </>}
    {selected === "crews" && <View style={card}>
      <AppText role="caption" secondary>WEEKLY CREW GOAL</AppText>
      <AppText role="heading">{goal[0]}</AppText>
      <View style={{ height: 12, borderRadius: 10, backgroundColor: c.soft, overflow: "hidden" }}>
        <View style={{ width: "72%", height: "100%", backgroundColor: c.tennis, borderRadius: 10 }} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <AppText role="caption">{goal[1]}</AppText>
        <AppText role="caption" secondary>72% of your crew's goal</AppText>
      </View>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        {names.map((member, i) => <View key={member} style={{ width: 43, height: 43, borderRadius: 24, backgroundColor: i === 1 ? c.tennis : c.actionSoft, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.line }}>
          <AppText role="heading">{member[0]}</AppText>
        </View>)}
        <AppText role="body" secondary style={{ flex: 1 }}>Your crew grows stronger together.</AppText>
      </View>
      <View style={{ borderRadius: 12, padding: 12, backgroundColor: c.actionSoft, gap: 4 }}>
        <AppText role="label">Crew Derby</AppText>
        <AppText role="caption">Compete alongside your crew against another team.</AppText>
      </View>
    </View>}
    {selected === "vitals" && <View style={{ ...card, backgroundColor: "#0A161D", borderColor: "#264650" }}>
      <AppText role="caption" style={{ color: "#9DB8C2" }}>VITALS LAB · BODY SCAN PREVIEW</AppText>
      <View style={{ height: 222, alignItems: "center", justifyContent: "center" }}>
        <Svg width="150" height="222" viewBox="0 0 150 222" accessible accessibilityLabel="Decorative illustrative body scan silhouette">
          <G fill="none" stroke="#57C7C3" strokeWidth="2" strokeLinejoin="round">
            <Circle cx="75" cy="30" r="19" fill="#103E45" />
            <Path d="M56 55 L47 66 L34 116 L44 121 L60 88 L61 135 L55 194 L69 197 L76 142 L81 197 L95 195 L89 135 L90 88 L107 121 L117 116 L103 66 L94 55 Q75 64 56 55 Z" fill="#103E45" />
            <Path d="M54 74 Q75 88 96 74 M61 106 Q75 114 89 106 M60 130 Q75 140 89 130" opacity=".4" />
            <Line x1="75" y1="54" x2="75" y2="143" opacity=".6" />
          </G>
          <Circle cx="75" cy="92" r="7" fill="#F3C952" opacity=".85" />
          <G stroke="#57C7C3" opacity=".35" strokeDasharray="3 6">
            <Line x1="0" y1="70" x2="150" y2="70" />
            <Line x1="0" y1="143" x2="150" y2="143" />
          </G>
        </Svg>
      </View>
      <View style={{ flexDirection: "row", gap: 7 }}>
        {["Sleep", "HRV", "Resting HR"].map(metric => <View key={metric} style={{ flex: 1, borderWidth: 1, borderColor: "#31545E", backgroundColor: "#15303A", padding: 8, borderRadius: 10 }}>
          <AppText role="caption" style={{ color: "#E5F4F4", textAlign: "center" }}>{metric}</AppText>
        </View>)}
      </View>
      <AppText role="caption" style={{ color: "#9DB8C2" }}>Connect health data to explore your own metrics.</AppText>
    </View>}
  </View>;
}
