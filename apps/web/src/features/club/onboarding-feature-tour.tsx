"use client";

import { useState } from "react";
import { OnboardingPotential } from "./onboarding-potential";
import { ONBOARDING_FEATURES, type SportId, type OnboardingFeatureId } from "@fitness-battle/shared";
import { AppHeading, AppParagraph } from "@/ui/section";

/** Static product examples: never pretend the guest has a crew, a rank, or health data. */
export function OnboardingFeatureTour({ sport }: { sport: SportId }) {
  const [selected, setSelected] = useState<OnboardingFeatureId>("growth");
  const feature = ONBOARDING_FEATURES.find(item => item.id === selected)!;
  const goal = sport === "cycling" ? ["Ride 150 km together", "108 / 150 km"] : sport === "walking" ? ["Walk 120,000 steps together", "86,400 / 120,000 steps"] : sport === "strength" ? ["Train 360 minutes together", "259 / 360 min"] : ["Move 40 km together", "28.8 / 40 km"];
  return <div className="fb-stack onboarding-features">
    <div className="onboarding-feature-tabs" aria-label="Explore Overtaek features">
      {ONBOARDING_FEATURES.map(item => <button type="button" key={item.id}
        aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>
        {item.label}
      </button>)}
    </div>
    {selected === "growth" ? <OnboardingPotential /> : <>
      <AppHeading>{feature.title}</AppHeading>
      <AppParagraph>{feature.description}</AppParagraph>
    </>}

    {selected === "crews" && <section className="fb-card fb-stack onboarding-feature-demo">
      <AppParagraph typographyRole="caption">WEEKLY CREW GOAL</AppParagraph>
      <AppHeading>{goal[0]}</AppHeading>
      <div className="onboarding-meter"><span style={{ width: "72%" }}/></div>
      <div className="onboarding-split"><strong>{goal[1]}</strong><small>72% of crew goal</small></div>
      <div className="onboarding-crew-row"><span>A</span><span>Y</span><span>S</span><p>Support each other's progress.</p></div>
      <div className="onboarding-feature-note"><strong>Crew Derby</strong><p>Compete alongside your crew against another team.</p></div>
    </section>}

    {selected === "vitals" && <section className="fb-stack onboarding-vitals-demo">
      <div className="onboarding-vitals-label">VITALS LAB · BODY SCAN PREVIEW</div>
      <svg viewBox="0 0 150 222" role="img" aria-label="Illustrative body scan silhouette" className="onboarding-body">
        <g fill="none" stroke="#57C7C3" strokeWidth="2" strokeLinejoin="round">
          <circle cx="75" cy="30" r="19" fill="#103E45" />
          <path d="M56 55 L47 66 L34 116 L44 121 L60 88 L61 135 L55 194 L69 197 L76 142 L81 197 L95 195 L89 135 L90 88 L107 121 L117 116 L103 66 L94 55 Q75 64 56 55 Z" fill="#103E45"/>
          <path d="M54 74 Q75 88 96 74 M61 106 Q75 114 89 106 M60 130 Q75 140 89 130" opacity=".4"/>
          <path d="M75 54 V143" opacity=".6"/>
        </g>
        <circle cx="75" cy="92" r="7" fill="#F3C952" opacity=".85"/>
        <g stroke="#57C7C3" opacity=".35" strokeDasharray="3 6"><path d="M0 70H150 M0 143H150"/></g>
      </svg>
      <div className="onboarding-health-metrics"><span>Sleep</span><span>HRV</span><span>Resting HR</span></div>
      <p>Connect health data to explore your own metrics.</p>
    </section>}
  </div>;
}
