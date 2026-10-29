import { textStyle } from "./section";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { PanResponder, Text, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { chartClientXToModel, nearestChartDatum, type ChartDatum } from "@fitness-battle/shared";
import { playCue } from "../lib/haptics";
import { SHELL_COLORS as c } from "../theme";

export type { ChartDatum };

const DIRECTION_LOCK_PX = 4;

/** One touch surface, shared by line and bar charts. Vertical drags yield to the page. */
export function ChartScrubber({
  points, width, height, plotTop, plotBottom, children, onSelect, label, summaryOnSelection = false, hideSummary = false, renderSummary, onSelectionChange,
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
  hideSummary?: boolean;
  renderSummary?: (point: ChartDatum | undefined) => ReactNode;
  onSelectionChange?: (point: ChartDatum | undefined) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const measuredWidth = useRef(1);
  const lastId = useRef<string | null>(null);
  const touchStart = useRef<{ x: number; y: number; locationX: number } | null>(null);
  const direction = useRef<"horizontal" | "vertical" | null>(null);
  const selected = points.find(point => point.id === selectedId);
  const latest = useRef({ points, width, onSelect, onSelectionChange });
  latest.current = { points, width, onSelect, onSelectionChange };
  const inspect = (locationX: number) => {
    const current = latest.current;
    const modelX = chartClientXToModel(locationX, { left: 0, width: measuredWidth.current }, current.width);
    const point = nearestChartDatum(current.points, modelX);
    if (!point || lastId.current === point.id) return;
    lastId.current = point.id;
    setSelectedId(point.id);
    current.onSelect?.(point.id);
    current.onSelectionChange?.(point);
    void playCue("selection");
  };
  const inspectRef = useRef(inspect);
  inspectRef.current = inspect;
  const clearSelection = () => {
    lastId.current = null;
    direction.current = null;
    setSelectedId(null);
    latest.current.onSelectionChange?.(undefined);
  };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) =>
      Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) >= DIRECTION_LOCK_PX
      && Math.abs(gesture.dx) >= Math.abs(gesture.dy),
    onPanResponderGrant: () => {
      direction.current = null;
    },
    onPanResponderMove: (event, gesture) => {
      if (!direction.current && Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) >= DIRECTION_LOCK_PX) {
        direction.current = Math.abs(gesture.dx) >= Math.abs(gesture.dy) ? "horizontal" : "vertical";
        if (direction.current === "vertical") {
          clearSelection();
          return;
        }
      }
      if (direction.current === "horizontal") inspectRef.current(event.nativeEvent.locationX);
    },
    onPanResponderTerminationRequest: () => direction.current !== "horizontal",
    onPanResponderRelease: () => { lastId.current = null; direction.current = null; },
    onPanResponderTerminate: () => { lastId.current = null; direction.current = null; },
  }), []);
  const move = (step: number) => {
    const index = points.findIndex(point => point.id === selectedId);
    const point = points[Math.max(0, Math.min(points.length - 1, (index < 0 ? points.length - 1 : index) + step))];
    if (point) inspect(point.x / width * measuredWidth.current);
  };
  return <View style={{ gap: 8 }}>
    {!hideSummary && (
      <View style={{ minHeight: summaryOnSelection ? 18 : 44, gap: 2 }} accessibilityLiveRegion="polite">
        {renderSummary ? renderSummary(selected) : summaryOnSelection ? (selected ? <Text style={textStyle("caption")}>{`${selected.label} · ${selected.value}`}</Text> : null) : <>
        <Text style={[textStyle("label"), { fontVariant: ["tabular-nums"] }]}>{selected?.value ?? points.at(-1)?.value ?? "No data"}</Text>
        <Text style={textStyle("caption")}>{selected?.label ?? points.at(-1)?.label ?? ""}</Text></>}
      </View>
    )}
    <View
      {...responder.panHandlers}
      onTouchStart={event => {
        touchStart.current = {
          x: event.nativeEvent.pageX,
          y: event.nativeEvent.pageY,
          locationX: event.nativeEvent.locationX,
        };
      }}
      onTouchEnd={event => {
        if (touchStart.current) {
          const dx = Math.abs(event.nativeEvent.pageX - touchStart.current.x);
          const dy = Math.abs(event.nativeEvent.pageY - touchStart.current.y);
          if (dx < 10 && dy < 10) {
            lastId.current = null;
            inspectRef.current(touchStart.current.locationX);
          }
          touchStart.current = null;
        }
      }}
      onTouchCancel={() => {
        touchStart.current = null;
      }}
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
        <Line x1={selected.x} x2={selected.x} y1={plotTop} y2={plotBottom} stroke={c.muted} strokeWidth={1} />
        <Circle cx={selected.x} cy={selected.y} r={4} fill={c.ink} stroke={c.card} strokeWidth={2} />
      </Svg>}
    </View>
  </View>;
}
