import { useMemo, useRef } from "react";
import { PanResponder, Text, View } from "react-native";
import { textStyle } from "./section";
import { useThemeColors } from "../theme";

/** Vertical camera navigation; gestures belong to this rail, never to the map. */
export function CoursePositionRail({ value, maximum, unit, onChange, height = 140, markers = [] }: { value: number; maximum: number; unit: string; onChange(value: number): void; height?: number; markers?: { value: number; you?: boolean }[] }) {
  const c = useThemeColors();
  const bounded = Math.max(0, Math.min(maximum, value));
  const latest = useRef({ maximum, onChange, height }); latest.current = { maximum, onChange, height };
  const top = useRef(0);
  const seek = (y: number) => latest.current.onChange(Math.max(0, Math.min(1, 1 - y / latest.current.height)) * latest.current.maximum);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => latest.current.maximum > 0,
    onMoveShouldSetPanResponder: () => latest.current.maximum > 0,
    onPanResponderGrant: e => { top.current = e.nativeEvent.pageY - e.nativeEvent.locationY; seek(e.nativeEvent.locationY); },
    onPanResponderMove: e => seek(e.nativeEvent.pageY - top.current),
    onPanResponderTerminationRequest: () => false,
  }), []);
  return <View onTouchStart={e => e.stopPropagation()} style={{ alignItems: "center", paddingVertical: 8, width: 52, borderRadius: 14, backgroundColor: "rgba(20, 20, 19, 0.72)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.14)" }}>
    <Text style={{ ...textStyle("caption"), color: "rgba(255,255,255,.75)" }}>Leader</Text>
    <View {...pan.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel="Course position" accessibilityState={{ disabled: maximum <= 0 }} accessibilityValue={{ min: 0, max: maximum, now: bounded, text: `${bounded.toFixed(1)} ${unit} along the course` }} accessibilityActions={[{ name: "increment" }, { name: "decrement" }]} onAccessibilityAction={e => onChange(Math.max(0, Math.min(maximum, bounded + (e.nativeEvent.actionName === "increment" ? 1 : -1) * maximum / 20)))} style={{ height, width: 44, alignItems: "center" }}>
      <View pointerEvents="none" style={{ height, width: 1, backgroundColor: "rgba(255,255,255,.3)", borderRadius: 2 }} />
      {markers.map((marker, i) => <View pointerEvents="none" key={i} style={{ position: "absolute", top: (1 - (maximum ? Math.min(1, Math.max(0, marker.value / maximum)) : 0)) * height, width: 9, height: 3, backgroundColor: marker.you ? c.tennis : "rgba(255,255,255,.6)", borderRadius: 2 }} />)}
      <View pointerEvents="none" style={{ position: "absolute", top: (1 - (maximum ? bounded / maximum : 0)) * height - 1, width: 28, height: 2, borderRadius: 1, backgroundColor: c.tennis }} />
    </View>
    <Text style={{ ...textStyle("caption"), color: "rgba(255,255,255,.75)" }}>Start</Text>
  </View>;
}
