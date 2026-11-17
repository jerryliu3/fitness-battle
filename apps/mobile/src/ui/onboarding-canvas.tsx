import { fitOnboardingCanvas, ONBOARDING_CANVAS } from "@fitness-battle/shared";
import { useState, type ReactNode } from "react";
import { View } from "react-native";

export { ONBOARDING_CANVAS } from "@fitness-battle/shared";

/** Fit the complete composition, including its controls, rather than clipping it. */
export function OnboardingCanvas({ children, height }: { children: ReactNode; height?: number }) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [contentHeight, setContentHeight] = useState(height ?? ONBOARDING_CANVAS.height);
  const { scale } = fitOnboardingCanvas(viewport.width, viewport.height, height ?? contentHeight);
  return <View pointerEvents="box-none" style={{ flex: 1, overflow: "hidden" }} onLayout={e => setViewport(e.nativeEvent.layout)}>
    <View pointerEvents="box-none" onLayout={height ? undefined : e => setContentHeight(e.nativeEvent.layout.height)}
      style={{ position: "absolute", width: ONBOARDING_CANVAS.width, height, left: (viewport.width - ONBOARDING_CANVAS.width) / 2,
        top: (viewport.height - (height ?? contentHeight)) / 2, opacity: scale > 0 ? 1 : 0,
        transform: [{ scale: Math.max(.01, scale) }] }}>
      {children}
    </View>
  </View>;
}
