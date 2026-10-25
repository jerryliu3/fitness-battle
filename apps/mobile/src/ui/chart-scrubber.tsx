import { textStyle } from "./section";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { PanResponder, Text, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { playCue } from "../lib/haptics";
import { SHELL_COLORS as c } from "../theme";
import { f } from "./focus";

import { nearestChartDatum, type ChartDatum } from "@fitness-battle/shared";

export type { ChartDatum };

/** One touch surface, shared by line and bar charts. Vertical drags yield to the page. */
export function ChartScrubber({
  points, width, height, plotTop, plotBottom, children, onSelect, label, summaryOnSelection = false,
}: {
  points: readonly ChartDatum[];
  width: number;
  height: number;
  plotTop: number;
  plotBottom: number;
  children: ReactNode;
  onSelect?: (id: string) => void;
  label: string;
  summaryOnSelection?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const measuredWidth = useRef(1);
  const lastId = useRef<string | null>(null);
  const direction = useRef<"horizontal" | "vertical" | null>(null);
  const selected = points.find(point => point.id === selectedId);
  const latest = useRef({ points, width, onSelect });
  latest.current = { points, width, onSelect };
  const inspect = (x: number) => {
    const current = latest.current;
    const point = nearestChartDatum(current.points, x / measuredWidth.current * current.width);
    if (!point || lastId.current === point.id) return;
    lastId.current = point.id;
    setSelectedId(point.id);
    current.onSelect?.(point.id);
    void playCue("selection");
  };
  const inspectRef = useRef(inspect);
  inspectRef.current = inspect;
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: event => {
      direction.current = null;
      inspectRef.current(event.nativeEvent.locationX);
    },
    onPanResponderMove: (event, gesture) => {
      if (!direction.current && Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) > 4)
        direction.current = Math.abs(gesture.dx) >= Math.abs(gesture.dy) ? "horizontal" : "vertical";
      if (direction.current === "horizontal") inspectRef.current(event.nativeEvent.locationX);
    },
    onPanResponderTerminationRequest: () => direction.current !== "horizontal",
    onPanResponderRelease: () => { lastId.current = null; direction.current = null; },
    onPanResponderTerminate: () => { lastId.current = null; direction.current = null; },
  }), []);
  const move = (direction: number) => {
    const index = points.findIndex(point => point.id === selectedId);
    const point = points[Math.max(0, Math.min(points.length - 1, (index < 0 ? points.length - 1 : index) + direction))];
    if (point) inspect(point.x / width * measuredWidth.current);
  };
  return <View style={{ gap: 8 }}>
    <View style={{ minHeight: summaryOnSelection ? 18 : 44, gap: 2 }} accessibilityLiveRegion="polite">
      {summaryOnSelection ? <Text style={textStyle("caption")}>{selected ? `${selected.label} · ${selected.value}` : "Slide across the chart to inspect"}</Text> : <>
      <Text style={[textStyle("label"), { fontVariant: ["tabular-nums"] }]}>{selected?.value ?? points.at(-1)?.value ?? "No data"}</Text>
      <Text style={textStyle("caption")}>{selected?.label ?? points.at(-1)?.label ?? ""}</Text></>}
    </View>
    <View
      {...responder.panHandlers}
      onLayout={event => { measuredWidth.current = Math.max(1, event.nativeEvent.layout.width); }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: selected ? `${selected.label}, ${selected.value}` : points.at(-1) ? `${points.at(-1)!.label}, ${points.at(-1)!.value}` : "No data" }}
      accessibilityHint="Slide horizontally to inspect values. Swipe up or down to change the selected point."
      accessibilityActions={[{ name: "increment", label: "Next point" }, { name: "decrement", label: "Previous point" }]}
      onAccessibilityAction={event => move(event.nativeEvent.actionName === "increment" ? 1 : -1)}
    >
      <View pointerEvents="none">{children}</View>
      {selected && <Svg pointerEvents="none" width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0 }}>
        <Line x1={selected.x} x2={selected.x} y1={plotTop} y2={plotBottom} stroke={c.ink} strokeWidth={1} strokeDasharray="3 3" />
        <Circle cx={selected.x} cy={selected.y} r={4} fill={c.ink} stroke={c.card} strokeWidth={2} />
      </Svg>}
    </View>
  </View>;
}
