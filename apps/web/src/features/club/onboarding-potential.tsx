"use client";
import { ONBOARDING_GROWTH } from "@fitness-battle/shared";
import { AppHeading, AppParagraph } from "@/ui/section";
import { RankSymbol } from "@/ui/rank-symbol";
import { StandardLineChart } from "@/ui/standard-line-chart";

export function OnboardingPotential() {
  const { scores, labels, pointLabels, from, to } = ONBOARDING_GROWTH;
  return <div className="fb-stack">
    <section className="fb-card fb-stack">
      <AppHeading>Potential Effort Score</AppHeading>
      <div className="onboarding-score"><strong>1,000</strong><span>→</span><strong>1,210</strong></div>
      <StandardLineChart height={166} values={scores} xLabels={labels} pointLabels={pointLabels} yAxisLabel="Effort Score" xAxisLabel="Week" showAxes animateReveal
        accessibilityLabel="Potential Effort Score growth from 1000 to 1210 over six weeks" />
    </section>
    <section className="fb-card fb-stack">
      <AppHeading>Potential rank progression</AppHeading>
      <div className="onboarding-ranks">
        <div><RankSymbol rank={from.id} size={72} decorative /><strong>{from.name}</strong></div>
        <span aria-hidden="true">→</span>
        <div><RankSymbol rank={to.id} size={72} decorative /><strong>{to.name}</strong></div>
      </div>
    </section>
    <AppParagraph typographyRole="caption">Your progress will depend on your training and competition results.</AppParagraph>
  </div>;
}
