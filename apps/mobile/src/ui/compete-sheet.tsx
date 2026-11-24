import { useCompetitionSheetHeight } from "./competition-sheet-height";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, PanResponder, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../theme";
import { useReducedMotion } from "./use-reduced-motion";

const FlipLayer = createContext<(flipping: boolean) => void>(() => {});
export const useCompeteFlipLayer = () => useContext(FlipLayer);

/** Moving the sheet changes coverage without resizing the retained field. */
export function CompeteSheet({ children, expandRequest, active, overview, scrollable = true, defaultIndex = 0, bottomInset = 0 }: { children: ReactNode; expandRequest: number; active: boolean; overview?: ReactNode; scrollable?: boolean; defaultIndex?: 0 | 1 | 2; bottomInset?: number }) {
  const [flipping, setFlipping] = useState(false);
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const hasDock = bottomInset > 0;
  const safeBottom = hasDock ? 0 : insets.bottom;
  const maximum = Math.max(160, height - insets.top - bottomInset);
  const [controlsHeight, setControlsHeight] = useState(76);
  const headingHeight = 44 + (overview ? controlsHeight : 0);
  const minimum = hasDock ? 0 : Math.min(maximum, headingHeight + safeBottom);
  const { setMinimum } = useCompetitionSheetHeight();
  useEffect(() => { if (active) setMinimum(minimum); }, [active, minimum, setMinimum]);
  const middle = Math.max(minimum, maximum * .42);
  const stops = [minimum, middle, maximum];
  const bodyHeight = Math.max(120, maximum - headingHeight - 44);
  const scrollPaddingBottom = safeBottom + 48;
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const offset = useRef(new Animated.Value(maximum - stops[0])).current;
  const origin = useRef(0);
  const reduced = useReducedMotion();
  const snap = (next: number) => {
    indexRef.current = next;
    setIndex(next);
    Animated.timing(offset, { toValue: maximum - stops[next], duration: reduced ? 0 : 280, useNativeDriver: true }).start();
  };
  const snapRef = useRef(snap);
  snapRef.current = snap;
  useEffect(() => { offset.setValue(maximum - [minimum, middle, maximum][indexRef.current]); }, [maximum, offset, minimum, middle]);
  useEffect(() => { if (active) snapRef.current(defaultIndex); }, [active, defaultIndex]);
  useEffect(() => { if (expandRequest) snapRef.current(2); }, [expandRequest]);
  useEffect(() => () => offset.stopAnimation(), [offset]);
  const createSheetPan = (tapToggle: boolean) => PanResponder.create({
    onStartShouldSetPanResponder: () => tapToggle,
    onMoveShouldSetPanResponder: tapToggle
      ? undefined
      : (_, gesture) => Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => offset.stopAnimation(value => { origin.current = value; }),
    onPanResponderMove: (_, gesture) => {
      const value = Math.max(0, Math.min(maximum - minimum, origin.current + gesture.dy));
      offset.setValue(value);
    },
    onPanResponderRelease: (_, gesture) => {
      if (tapToggle && Math.abs(gesture.dy) < 5) { snapRef.current(indexRef.current === 2 ? 1 : 2); return; }
      const visible = maximum - origin.current - gesture.dy - gesture.vy * 100;
      const points = [minimum, middle, maximum];
      snapRef.current(points.reduce((best, value, next) => Math.abs(value - visible) < Math.abs(points[best] - visible) ? next : best, 0));
    },
    onPanResponderTerminate: () => snapRef.current(indexRef.current),
  });
  const pan = useMemo(() => createSheetPan(true), [maximum, offset, minimum, middle]);
  const overviewPan = useMemo(() => createSheetPan(false), [maximum, offset, minimum, middle]);
  return <Animated.View pointerEvents={active ? "auto" : "none"} accessibilityElementsHidden={!active} style={{ position: "absolute", left: 0, right: 0, bottom: bottomInset, height: maximum, zIndex: flipping ? 100 : 30, transform: [{ translateY: offset }], backgroundColor: c.card, borderTopWidth: 1, borderColor: c.line, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: flipping ? "visible" : "hidden" }}>

    {(!hasDock || index !== 0) && <View {...pan.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel="Competition sheet height" accessibilityValue={{ text: ["Minimized", "Partially expanded", "Fully expanded"][index] }} accessibilityActions={[{ name: "increment", label: "Expand" }, { name: "decrement", label: "Minimize" }]} onAccessibilityAction={event => snap(Math.max(0, Math.min(2, index + (event.nativeEvent.actionName === "increment" ? 1 : -1))))} style={{ height: 44, alignItems: "center", justifyContent: "center" }}><View style={{ width: 40, height: 4, borderRadius: 4, backgroundColor: c.muted }} /></View>}
    {overview && <View {...overviewPan.panHandlers} onLayout={event => setControlsHeight(Math.ceil(event.nativeEvent.layout.height))} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>{overview}</View>}
    <ScrollView removeClippedSubviews={false} style={{ height: bodyHeight, overflow: flipping ? "visible" : "hidden", zIndex: flipping ? 1 : 0 }} nestedScrollEnabled scrollEnabled={scrollable && !flipping} contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: scrollPaddingBottom, minHeight: bodyHeight }}><FlipLayer.Provider value={setFlipping}>{children}</FlipLayer.Provider></ScrollView>
  </Animated.View>;
}
