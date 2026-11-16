"use client";
import { ONBOARDING_GROWTH } from "@fitness-battle/shared";
import { AppHeading, AppParagraph } from "@/ui/section";
import { StandardLineChart } from "@/ui/standard-line-chart";

/** Sample values, not the guest's actual starting score or expected outcome. */
export function OnboardingPotential() {
  const { scores, labels, pointLabels } = ONBOARDING_GROWTH;
  const start = scores[0]!, end = scores[scores.length - 1]!;
  return <div className="fb-stack">
    <AppParagraph>Stay consistent and see how your effort adds up over time.</AppParagraph>
    <section className="fb-card fb-stack">
      <AppHeading>Potential Effort Score</AppHeading>
      <div className="onboarding-score"><strong>{start.toLocaleString("en-US")}</strong><span>→</span><strong>{end.toLocaleString("en-US")}</strong></div>
      <StandardLineChart height={220} values={scores} xLabels={labels} pointLabels={pointLabels}
        showAxes animateReveal accessibilityLabel={`Potential score growth from ${start} to ${end} over seven weeks`} />
    </section>
    <section className="fb-card fb-stack">
      <AppHeading>Every session is part of the story.</AppHeading>
      <div className="onboarding-three-steps">
        {["Train", "Build effort", "New weekly field"].map((label, index) =>
          <div key={label}><b>{index + 1}</b><span>{label}</span></div>)}
      </div>
      <AppParagraph typographyRole="caption">Your long-term progress can grow even while weekly competitions start fresh.</AppParagraph>
    </section>
    <AppParagraph typographyRole="caption">Your progress depends on your activity. Every athlete starts from their own baseline.</AppParagraph>
  </div>;
}
