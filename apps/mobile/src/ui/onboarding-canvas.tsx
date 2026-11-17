import { fitOnboardingCanvas, ONBOARDING_CANVAS } from "@fitness-battle/shared";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Keyboard, TextInput, View } from "react-native";

export { ONBOARDING_CANVAS } from "@fitness-battle/shared";

/** Fit the composition once; reveal keyboard-covered fields without changing its scale. */
export function OnboardingCanvas({ children, height }: { children: ReactNode; height?: number }) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const baseline = useRef(viewport);
  const offset = useRef(0);
  const [shift, setShift] = useState(0);
  function revealField(keyboardTop = Keyboard.metrics?.()?.screenY) {
    if (keyboardTop === undefined) return;
    TextInput.State.currentlyFocusedInput?.()?.measureInWindow((_x, y, _width, fieldHeight) => {
      const next = Math.min(0, keyboardTop - 12 - (y + fieldHeight - offset.current));
      offset.current = next; setShift(next);
    });
  }
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", e => revealField(e.endCoordinates.screenY));
    const frame = Keyboard.addListener("keyboardWillChangeFrame", e => revealField(e.endCoordinates.screenY));
    const hide = Keyboard.addListener("keyboardDidHide", () => { offset.current = 0; setShift(0); });
    return () => { show.remove(); frame.remove(); hide.remove(); };
  }, []);
  const [contentHeight, setContentHeight] = useState(height ?? ONBOARDING_CANVAS.height);
  const { scale } = fitOnboardingCanvas(viewport.width, viewport.height, height ?? contentHeight);
  return <View pointerEvents="box-none" style={{ flex: 1, overflow: "hidden" }} onTouchEnd={() => requestAnimationFrame(() => revealField())} onLayout={e => {
    const next = e.nativeEvent.layout;
    const typing = Boolean(TextInput.State.currentlyFocusedInput?.());
    // Android may resize the root before its keyboard event arrives.
    if (next.width === baseline.current.width && next.height < baseline.current.height && (typing || Keyboard.isVisible())) return;
    baseline.current = next; setViewport(next);
  }}>
    <View pointerEvents="box-none" onLayout={height ? undefined : e => setContentHeight(e.nativeEvent.layout.height)}
      style={{ position: "absolute", width: ONBOARDING_CANVAS.width, height, left: (viewport.width - ONBOARDING_CANVAS.width) / 2,
        top: (viewport.height - (height ?? contentHeight)) / 2 + shift, opacity: scale > 0 ? 1 : 0,
        transform: [{ scale: Math.max(.01, scale) }] }}>
      {children}
    </View>
  </View>;
}
