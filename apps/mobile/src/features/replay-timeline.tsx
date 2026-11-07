import { useMemo, useRef } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import { SHELL_COLORS as c } from "../theme";
export function ReplayTimeline({ cursor, count, caption, onSeek, label = "Competition replay timeline" }: { cursor: number; count: number; caption: string; onSeek: (cursor: number) => void; label?: string }) {
  const width = useRef(1), left = useRef(0);
  const latest = useRef({ count, onSeek }); latest.current = { count, onSeek };
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => latest.current.count > 0,
    onMoveShouldSetPanResponder: () => latest.current.count > 0,
    onPanResponderGrant: event => { left.current = event.nativeEvent.pageX - event.nativeEvent.locationX; latest.current.onSeek(Math.max(0, Math.min(1, event.nativeEvent.locationX / width.current)) * latest.current.count); },
    onPanResponderMove: event => latest.current.onSeek(Math.max(0, Math.min(1, (event.nativeEvent.pageX - left.current) / width.current)) * latest.current.count),
    onPanResponderTerminationRequest: () => false,
  }), []);
  return <View style={s.timeline} {...pan.panHandlers} onLayout={event => { width.current = Math.max(1, event.nativeEvent.layout.width); }}
    accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityState={{ disabled: !count }}
    accessibilityValue={{ min: 0, max: count, now: Math.ceil(cursor), text: `${Math.ceil(cursor)} of ${count} events. ${caption}` }}
    accessibilityActions={[{ name: "increment", label: "Next event" }, { name: "decrement", label: "Previous event" }]}
    onAccessibilityAction={event => onSeek(event.nativeEvent.actionName === "increment" ? Math.floor(cursor) + 1 : Math.ceil(cursor) - 1)}>
    <View pointerEvents="none" style={s.rail}><View style={[s.fill, { width: `${count ? cursor / count * 100 : 0}%` }]} /></View>
    <View pointerEvents="none" style={[s.thumb, { left: `${count ? cursor / count * 100 : 0}%` }]} />
  </View>;
}
const s = StyleSheet.create({
  timeline: { height: 44, justifyContent: "center", marginHorizontal: 10 },
  rail: { height: 4, borderRadius: 2, backgroundColor: c.line, overflow: "hidden" },
  fill: { height: 4, backgroundColor: "#176c75" },
  thumb: { position: "absolute", top: 12, width: 20, height: 20, marginLeft: -10, borderRadius: 10, backgroundColor: "#176c75", borderWidth: 2, borderColor: "white" },
});
