import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, PanResponder, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../theme";
import { useReducedMotion } from "./use-reduced-motion";

/** Moving the sheet changes coverage without resizing the retained field. */
export function CompeteSheet({ children, expandRequest, active, overview }: { children: ReactNode; expandRequest: number; active: boolean; overview?: ReactNode }) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const bottom = 0;
  const maximum = Math.max(160, height - insets.top - bottom);
  const [controlsHeight, setControlsHeight] = useState(76);
  const headingHeight = 44 + (overview ? controlsHeight : 0);
  const minimum = headingHeight + insets.bottom;
  const stops = [minimum, maximum * .42, maximum];
  const [visibleHeight, setVisibleHeight] = useState(maximum * .42);
  const [index, setIndex] = useState(1);
  const indexRef = useRef(1);
  const offset = useRef(new Animated.Value(maximum - stops[1])).current;
  const origin = useRef(0);
  const reduced = useReducedMotion();
  const snap = (next: number) => {
    indexRef.current = next;
    setIndex(next);
    setVisibleHeight(stops[next]);
    Animated.timing(offset, { toValue: maximum - stops[next], duration: reduced ? 0 : 280, useNativeDriver: true }).start();
  };
  const snapRef = useRef(snap);
  snapRef.current = snap;
  useEffect(() => { setVisibleHeight([minimum, maximum * .42, maximum][indexRef.current]); offset.setValue(maximum - [minimum, maximum * .42, maximum][indexRef.current]); }, [maximum, offset, insets.bottom, minimum]);
  useEffect(() => { if (expandRequest) snapRef.current(2); }, [expandRequest]);
  useEffect(() => () => offset.stopAnimation(), [offset]);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => offset.stopAnimation(value => { origin.current = value; }),
    onPanResponderMove: (_, gesture) => { const value = Math.max(0, Math.min(maximum - minimum, origin.current + gesture.dy)); offset.setValue(value); setVisibleHeight(maximum - value); },
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dy) < 5) { snapRef.current(indexRef.current === 2 ? 1 : 2); return; }
      const visible = maximum - origin.current - gesture.dy - gesture.vy * 100;
      const points = [minimum, maximum * .42, maximum];
      snapRef.current(points.reduce((best, value, next) => Math.abs(value - visible) < Math.abs(points[best] - visible) ? next : best, 0));
    },
    onPanResponderTerminate: () => snapRef.current(indexRef.current),
  }), [maximum, offset, insets.bottom, minimum]);
  return <Animated.View pointerEvents={active ? "auto" : "none"} accessibilityElementsHidden={!active} style={{ opacity: active ? 1 : 0, position: "absolute", left: 0, right: 0, bottom, height: maximum, zIndex: 30, transform: [{ translateY: offset }], backgroundColor: c.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "visible" }}>

    <View {...pan.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel="Competition sheet height" accessibilityValue={{ text: ["Minimized", "Partially expanded", "Fully expanded"][index] }} accessibilityActions={[{ name: "increment", label: "Expand" }, { name: "decrement", label: "Minimize" }]} onAccessibilityAction={event => snap(Math.max(0, Math.min(2, index + (event.nativeEvent.actionName === "increment" ? 1 : -1))))} style={{ height: 44, alignItems: "center", justifyContent: "center" }}><View style={{ width: 40, height: 4, borderRadius: 4, backgroundColor: c.muted }} /></View>
    {overview && <View onLayout={event => setControlsHeight(Math.ceil(event.nativeEvent.layout.height))} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>{overview}</View>}
    <ScrollView removeClippedSubviews={false} style={{ height: maximum - headingHeight, flexGrow: 0 }} nestedScrollEnabled scrollEnabled={index !== 0} accessibilityElementsHidden={index === 0} contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: Math.max(0, maximum - visibleHeight) + insets.bottom + 32 }}>{children}</ScrollView>
  </Animated.View>;
}
