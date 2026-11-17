import { Pressable, View } from "react-native";
import { CrewRelay } from "./crew-relay";
import { VitalsLabPanel } from "./vitals-lab/vitals-lab-panel";
import { AppText } from "../ui/section";
import { useThemeColors } from "../theme";
import { OnboardingPotential } from "./onboarding-potential";
import { ONBOARDING_FEATURES, ONBOARDING_VITALS_METRICS, onboardingCrewPreview, type GuestIntroDraft, type OnboardingFeatureId } from "@fitness-battle/shared";

export function OnboardingFeatureTour({ draft, selected, onSelect }: { draft: GuestIntroDraft; selected: OnboardingFeatureId; onSelect: (id: OnboardingFeatureId) => void }) {
  const feature = ONBOARDING_FEATURES.find(item => item.id === selected)!;
  const c = useThemeColors();
  return <View style={{ gap: 16 }}>
    <View style={{ flexDirection: "row", gap: 7 }}>
      {ONBOARDING_FEATURES.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label}
        accessibilityState={{ selected: item.id === selected }} onPress={() => onSelect(item.id)}
        style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12,
          backgroundColor: item.id === selected ? c.actionSoft : c.card, borderWidth: 1, borderColor: item.id === selected ? c.ink : c.line }}>
        <AppText role="caption">{item.label}</AppText>
      </Pressable>)}
    </View>
    {selected === "growth" ? <OnboardingPotential /> : <><AppText role="heading">{feature.title}</AppText><AppText secondary>{feature.description}</AppText></>}
    {selected === "crews" && <CrewRelay {...onboardingCrewPreview(draft)} userId="you" compact units="metric" />}
    {selected === "vitals" && <VitalsLabPanel metrics={ONBOARDING_VITALS_METRICS} />}
  </View>;
}
