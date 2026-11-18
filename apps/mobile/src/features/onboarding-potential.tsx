import { ONBOARDING_GROWTH, onboardingGrowthScore } from "@fitness-battle/shared";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import { useThemeColors } from "../theme";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { AppText } from "../ui/section";
import { StandardLineChart } from "../ui/standard-line-chart";

export function OnboardingPotential({ onScoreChange, chartHeight = 234 }: { chartHeight?: number; onScoreChange?: (score: number) => void }) {
  const c = useThemeColors(), reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const [score, setScore] = useState(500);
  useEffect(() => {
    progress.setValue(reduced ? 1 : 0);
    let last = -1;
    const update = (value: number) => {
      const next = Math.round(onboardingGrowthScore(value) / 25) * 25;
      if (next === last) return;
      last = next; setScore(next); onScoreChange?.(next);
    };
    update(reduced ? 1 : 0);
    const listener = progress.addListener(({ value }) => update(value));
    const animation = Animated.timing(progress, { toValue: 1, duration: reduced ? 0 : 2400, easing: Easing.linear, useNativeDriver: false });
    animation.start();
    return () => { animation.stop(); progress.removeListener(listener); };
  }, [progress, reduced, onScoreChange]);
  return <View style={{ backgroundColor: c.card, borderRadius: 24, padding: 16, gap: 12 }}>
    <AppText role="caption">Effort Score</AppText>
    <AppText role="hero">{score.toLocaleString("en-US")}</AppText>
    <StandardLineChart height={chartHeight} values={ONBOARDING_GROWTH.scores} xLabels={ONBOARDING_GROWTH.labels} pointLabels={ONBOARDING_GROWTH.pointLabels}
      revealProgress={progress} followRevealDot showAxes showTrend={false} accessibilityLabel="Potential Effort Score growth" />
  </View>;
}
