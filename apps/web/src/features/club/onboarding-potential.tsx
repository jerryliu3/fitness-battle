"use client";
import { useCallback, useState } from "react";
import { ONBOARDING_GROWTH, onboardingGrowthScore } from "@fitness-battle/shared";
import { AppHeading } from "@/ui/section";
import { StandardLineChart } from "@/ui/standard-line-chart";

export function OnboardingPotential({ onScoreChange }: { onScoreChange?: (score: number) => void }) {
  const [score, setScore] = useState(500);
  const reveal = useCallback((progress: number) => {
    const next = onboardingGrowthScore(progress);
    setScore(next); onScoreChange?.(next);
  }, [onScoreChange]);
  return <section className="fb-card fb-stack">
    <AppHeading>Effort Score</AppHeading>
    <div className="onboarding-score"><strong>{score.toLocaleString("en-US")}</strong></div>
    <StandardLineChart height={220} values={ONBOARDING_GROWTH.scores} xLabels={ONBOARDING_GROWTH.labels} pointLabels={ONBOARDING_GROWTH.pointLabels}
      showAxes animateReveal followRevealDot revealDuration={2400} onRevealProgress={reveal} accessibilityLabel="Potential Effort Score growth" />
  </section>;
}
