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
      <AppHeading>Example Effort Score</AppHeading>
      <div className="onboarding-score"><strong>{start.toLocaleString("en-US")}</strong><span>→</span><strong>{end.toLocaleString("en-US")}</strong></div>
      <StandardLineChart height={166} values={scores} xLabels={labels} pointLabels={pointLabels}
        showAxes animateReveal accessibilityLabel={`Illustrative score growth from ${start} to ${end} across seven example weeks`} />
    </section>
    <section className="fb-card fb-stack">
      <AppHeading>Every session is part of the story.</AppHeading>
      <div className="onboarding-three-steps">
        {["Train", "Build effort", "New weekly field"].map((label, index) =>
          <div key={label}><b>{index + 1}</b><span>{label}</span></div>)}
      </div>
      <AppParagraph typographyRole="caption">Your long-term progress can grow even while weekly competitions start fresh.</AppParagraph>
    </section>
    <AppParagraph typographyRole="caption">Illustrative only—not a starting score, prediction, or guaranteed gain. Real progress depends on your activity.</AppParagraph>
  </div>;
}
