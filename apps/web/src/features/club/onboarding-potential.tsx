"use client";
import { ONBOARDING_GROWTH } from "@fitness-battle/shared";
import { AppHeading, AppParagraph } from "@/ui/section";
import { StandardLineChart } from "@/ui/standard-line-chart";

/** Sample values, not the guest's actual starting score or expected outcome. */
export function OnboardingPotential() {
  const { scores, labels, pointLabels } = ONBOARDING_GROWTH;
  const start = scores[0]!, end = scores[scores.length - 1]!;
  return <div className="fb-stack">
    <section className="fb-card fb-stack">
      <AppHeading>Effort Score</AppHeading>
      <div className="onboarding-score"><strong>{start.toLocaleString("en-US")}</strong><span>→</span><strong>{end.toLocaleString("en-US")}</strong></div>
      <StandardLineChart height={220} values={scores} xLabels={labels} pointLabels={pointLabels}
        showAxes animateReveal accessibilityLabel={`Potential score growth from ${start} to ${end} over seven weeks`} />
    </section>
    <AppParagraph>As you train, your athlete’s progress becomes visible through scores, records and trends.</AppParagraph>
  </div>;
}
