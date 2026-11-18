import { useState } from "react";
import { View } from "react-native";
import { VitalsLabPanel } from "./vitals-lab/vitals-lab-panel";
import { AppText } from "../ui/section";
import { FocusSegments } from "../ui/focus";
import { OnboardingPotential } from "./onboarding-potential";
import { OnboardingCrew } from "./onboarding-crew";
import { OnboardingCanvas } from "../ui/onboarding-canvas";
import { ONBOARDING_FEATURES, ONBOARDING_VITALS_METRICS, type GuestIntroDraft, type OnboardingFeatureId } from "@fitness-battle/shared";

export function OnboardingFeatureTour({ draft, selected, onSelect, onScoreChange, layoutScale = 1 }: {
  layoutScale?: number; draft: GuestIntroDraft; selected: OnboardingFeatureId; onSelect: (id: OnboardingFeatureId) => void; onScoreChange?: (score: number) => void;
}) {
  const [gender, setGender] = useState<"female" | "male">("male");
  return <View style={{ flex: 1 }}>
    <View style={{ width: 228 * layoutScale, marginTop: 8 * layoutScale, gap: 8 * layoutScale }}>
      <AppText accessibilityRole="header" role="heading">{ONBOARDING_FEATURES.find(item => item.id === selected)!.heading}</AppText>
      <FocusSegments label="Discover" compact pill options={ONBOARDING_FEATURES.map(item => ({ value: item.id, label: item.label }))} value={selected} onChange={onSelect} />
      {selected === "vitals" && <FocusSegments label="Body model" compact pill options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }]} value={gender} onChange={setGender} />}
    </View>
    <View style={{ flex: 1, marginTop: 12 * layoutScale }}>
      <OnboardingCanvas>
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {selected === "growth" && <OnboardingPotential chartHeight={234 * layoutScale} onScoreChange={onScoreChange} />}
          {selected === "crews" && <OnboardingCrew draft={draft} />}

        </View>
      </OnboardingCanvas>
      <View pointerEvents={selected === "vitals" ? "auto" : "none"} accessibilityElementsHidden={selected !== "vitals"} aria-hidden={selected !== "vitals"}
        style={{ position: "absolute", inset: 0, opacity: selected === "vitals" ? 1 : 0 }}>
        <OnboardingCanvas><View style={{ paddingHorizontal: 16 }}><VitalsLabPanel metrics={ONBOARDING_VITALS_METRICS} gender={gender} height={370 * layoutScale} /></View></OnboardingCanvas>
      </View>
    </View>
  </View>;
}
