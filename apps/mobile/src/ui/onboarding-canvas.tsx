import { fitOnboardingCanvas, ONBOARDING_CANVAS } from "@fitness-battle/shared";
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { Keyboard, Platform, ScrollView, TextInput, View, type ViewProps } from "react-native";

export { ONBOARDING_CANVAS } from "@fitness-battle/shared";

/** Center the composition; scroll native overflow and reveal keyboard-covered fields. */
export function OnboardingCanvas({ children, height, pointerEvents = "box-none" }: { children: ReactNode | ((scale: number) => ReactNode); height?: number; pointerEvents?: ViewProps["pointerEvents"] }) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const baseline = useRef(viewport);
  const offset = useRef(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const lastFocused = useRef<unknown>(null);
  const scrollY = useRef(0);
  const [shift, setShift] = useState(0);
  function revealField(keyboardTop = Keyboard.metrics?.()?.screenY) {
    const input = TextInput.State.currentlyFocusedInput?.();
    if (Platform.OS !== "web" && input) lastFocused.current = input;
    if (keyboardTop === undefined) return;
    input?.measureInWindow((_x, y, _width, fieldHeight) => {
      if (TextInput.State.currentlyFocusedInput?.() !== input) return;
      if (Platform.OS !== "web") {
        // Both bounds are in window coordinates; the scroll helper's content
        // coordinates omit the safe-area/header offset and can hide the field.
        const covered = y + fieldHeight + 12 - keyboardTop;
        if (covered > 0) scroll.current?.scrollTo({ y: Math.max(0, scrollY.current + covered), animated: true });
        return;
      }
      const next = Math.min(0, keyboardTop - 12 - (y + fieldHeight - offset.current));
      offset.current = next; setShift(next);
    });
  }
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", e => revealField(e.endCoordinates.screenY));
    const frame = Keyboard.addListener(Platform.OS === "web" ? "keyboardWillChangeFrame" : "keyboardDidChangeFrame", e => revealField(e.endCoordinates.screenY));
    const hide = Keyboard.addListener("keyboardDidHide", () => { offset.current = 0; lastFocused.current = null; setShift(0); });
    return () => { show.remove(); frame.remove(); hide.remove(); };
  }, []);
  const [contentHeight, setContentHeight] = useState(height ?? ONBOARDING_CANVAS.height);
  const { scale } = fitOnboardingCanvas(viewport.width, viewport.height, height ?? contentHeight);
  // Native text, SVG and WebViews must lay out at their displayed size. Scaling
  // the complete composition resamples their backing layers on Retina screens.
  const native = Platform.OS !== "web";
  const responsive = typeof children === "function";
  // Keep the 52-point action rows at least 44 points tall; smaller screens scroll.
  const layoutScale = native && responsive
    ? Math.min(viewport.width / ONBOARDING_CANVAS.width, Math.max(44 / 52, scale)) : 1;
  const content = <View pointerEvents="box-none" onLayout={height ? undefined : e => setContentHeight(e.nativeEvent.layout.height)}
    style={native ? { width: ONBOARDING_CANVAS.width * layoutScale, maxWidth: "100%", height: height === undefined ? undefined : height * layoutScale } : {
      position: "absolute", width: ONBOARDING_CANVAS.width, height, left: (viewport.width - ONBOARDING_CANVAS.width) / 2,
      top: (viewport.height - (height ?? contentHeight)) / 2 + shift, opacity: scale > 0 ? 1 : 0,
      transform: [{ scale: Math.max(.01, scale) }],
    }}>{responsive ? children(layoutScale) : children}</View>;
  return <View pointerEvents={pointerEvents} style={{ flex: 1, overflow: "hidden" }} onTouchEnd={() => requestAnimationFrame(() => {
    // A manual drag must not immediately snap back to the same focused field.
    if (Platform.OS === "web" || TextInput.State.currentlyFocusedInput?.() !== lastFocused.current) revealField();
  })} onLayout={e => {
    const next = e.nativeEvent.layout;
    const typing = Boolean(TextInput.State.currentlyFocusedInput?.());
    // Android may resize the root before its keyboard event arrives.
    if (next.width === baseline.current.width && next.height < baseline.current.height && (typing || Keyboard.isVisible())) return;
    baseline.current = next; setViewport(next);
  }}>
    {native ? <ScrollView ref={scroll} automaticallyAdjustKeyboardInsets keyboardDismissMode="none" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
      onScroll={e => { scrollY.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}
      contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center" }}>
      {content}
    </ScrollView> : content}
  </View>;
}
