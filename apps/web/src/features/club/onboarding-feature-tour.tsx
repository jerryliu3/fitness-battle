"use client";
import { VitalsLabExperience } from "@fitness-battle/pursuit/vitals-lab";
import { AppHeading } from "@/ui/section";
import { OnboardingCrew } from "./onboarding-crew";
import { OnboardingPotential } from "./onboarding-potential";
import { ONBOARDING_FEATURES, ONBOARDING_VITALS_METRICS, type GuestIntroDraft, type OnboardingFeatureId } from "@fitness-battle/shared";

export function OnboardingFeatureTour({ draft, selected, onSelect, onScoreChange }: { draft: GuestIntroDraft; selected: OnboardingFeatureId; onSelect: (id: OnboardingFeatureId) => void; onScoreChange?: (score: number) => void }) {
  return <div className="fb-stack onboarding-features" style={{ position: "relative" }}>
    <AppHeading level={1} role="heading">{ONBOARDING_FEATURES.find(item => item.id === selected)!.heading}</AppHeading>
    <div className="onboarding-feature-tabs" aria-label="Explore Overtaek features">
      {ONBOARDING_FEATURES.map(item => <button type="button" key={item.id} aria-pressed={selected === item.id} onClick={() => onSelect(item.id)}>{item.label}</button>)}
    </div>
    {selected === "growth" && <OnboardingPotential onScoreChange={onScoreChange} />}
    {selected === "crews" && <OnboardingCrew draft={draft} />}
    <div aria-hidden={selected !== "vitals"} inert={selected !== "vitals"} style={selected === "vitals" ? undefined : { position: "absolute", inset: 0, overflow: "hidden", visibility: "hidden", pointerEvents: "none" }}>
      <VitalsLabExperience metrics={ONBOARDING_VITALS_METRICS} embedded />
    </div>
  </div>;
}
