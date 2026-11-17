"use client";
import { VitalsLabExperience } from "@fitness-battle/pursuit/vitals-lab";
import { CrewRelay } from "@/features/rally/crew-relay";
import { AppHeading, AppParagraph } from "@/ui/section";
import { OnboardingPotential } from "./onboarding-potential";
import { ONBOARDING_FEATURES, ONBOARDING_VITALS_METRICS, onboardingCrewPreview, type GuestIntroDraft, type OnboardingFeatureId } from "@fitness-battle/shared";

export function OnboardingFeatureTour({ draft, selected, onSelect }: { draft: GuestIntroDraft; selected: OnboardingFeatureId; onSelect: (id: OnboardingFeatureId) => void }) {
  const feature = ONBOARDING_FEATURES.find(item => item.id === selected)!;
  return <div className="fb-stack onboarding-features">
    <div className="onboarding-feature-tabs" aria-label="Explore Overtaek features">
      {ONBOARDING_FEATURES.map(item => <button type="button" key={item.id} aria-pressed={selected === item.id} onClick={() => onSelect(item.id)}>{item.label}</button>)}
    </div>
    {selected === "growth" ? <OnboardingPotential /> : <><AppHeading>{feature.title}</AppHeading><AppParagraph>{feature.description}</AppParagraph></>}
    {selected === "crews" && <CrewRelay {...onboardingCrewPreview(draft)} userId="you" compact units="metric" />}
    {selected === "vitals" && <VitalsLabExperience metrics={ONBOARDING_VITALS_METRICS} embedded />}
  </div>;
}
