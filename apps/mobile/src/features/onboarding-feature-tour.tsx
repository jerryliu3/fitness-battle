import { useState } from "react";
import { View } from "react-native";
import { VitalsLabPanel } from "./vitals-lab/vitals-lab-panel";
import { FocusSegments } from "../ui/focus";
import { OnboardingPotential } from "./onboarding-potential";
import { OnboardingCrew } from "./onboarding-crew";
import { OnboardingCanvas } from "../ui/onboarding-canvas";
import { ONBOARDING_FEATURES, ONBOARDING_VITALS_METRICS, type GuestIntroDraft, type OnboardingFeatureId } from "@fitness-battle/shared";

export function OnboardingFeatureTour({ draft, selected, onSelect, onScoreChange }: {
  draft: GuestIntroDraft; selected: OnboardingFeatureId; onSelect: (id: OnboardingFeatureId) => void; onScoreChange?: (score: number) => void;
}) {
  const [gender, setGender] = useState<"female" | "male">("female");
  return <View style={{ flex: 1 }}>
    <View style={{ width: 214, marginTop: 20, gap: 8 }}>
      <FocusSegments label="Discover" compact pill options={ONBOARDING_FEATURES.map(item => ({ value: item.id, label: item.label }))} value={selected} onChange={onSelect} />
      {selected === "vitals" && <FocusSegments label="Body model" compact pill options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }]} value={gender} onChange={setGender} />}
    </View>
    <View style={{ position: "absolute", top: 126, left: 0, right: 0, bottom: 0 }}>
      <OnboardingCanvas>
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {selected === "growth" && <OnboardingPotential onScoreChange={onScoreChange} />}
          {selected === "crews" && <OnboardingCrew draft={draft} />}
          {selected === "vitals" && <>
            <VitalsLabPanel metrics={ONBOARDING_VITALS_METRICS} gender={gender} height={370} />
          </>}
        </View>
      </OnboardingCanvas>
    </View>
  </View>;
}
