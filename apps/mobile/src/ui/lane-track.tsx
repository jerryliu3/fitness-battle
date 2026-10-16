import { useMemo, useRef, useState, useEffect } from "react";
import { PanResponder, ScrollView, Text, View } from "react-native";
import Svg, { Circle, G, Line, Rect, Text as SvgText } from "react-native-svg";
import {
  arenaPosition,
  arenaWindow,
  orderedArenaLanes,
  initialsFromName,
  type ArenaLane,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
import { f } from "./focus";
export function LaneTrack({
  lanes,
  unit,
  showGhost,
  index,
  onSelect,
  view,
  onPan,
}: {
  lanes: ArenaLane[];
  labels: [string, string, string];
  unit: string;
  showGhost: boolean;
  index: number;
  onSelect: (lane: ArenaLane) => void;
  view?: ArenaViewWindow;
  onPan?: (center: number) => void;
}) {
  const [width, setWidth] = useState(340);
  const scroll = useRef<ScrollView>(null);
  const me = lanes.find((l) => l.you);
  const v = view ?? {
    center: me?.values[index] ?? 0,
    span: unit === "km" ? 6 : 20,
  };
  const latest = useRef({ v, onPan });
  latest.current = { v, onPan };
  const start = useRef(v.center);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dy) > 7 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => {
          start.current = latest.current.v.center;
        },
        onPanResponderMove: (_, g) =>
          latest.current.onPan?.(
            Math.max(0, start.current + (g.dy / 390) * latest.current.v.span),
          ),
      }),
    [],
  );
  const ordered = orderedArenaLanes(lanes);
  const ghost = showGhost ? lanes.find((l) => l.ghost) : null;
  const w = Math.max(width, ordered.length * 62 + 42),
    lw = (w - 42) / Math.max(1, ordered.length);
  const bounds = arenaWindow(v.center, v.span);
  const y = (value: number) => 64 + arenaPosition(value, v).fraction * 390;
  useEffect(() => {
    scroll.current?.scrollTo({
      x: Math.max(0, (w - width) / 2),
      animated: false,
    });
  }, [w, width]);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "#edf2e8",
      }}
    >
      <ScrollView
        horizontal
        ref={scroll}
        nestedScrollEnabled
        showsHorizontalScrollIndicator
      >
        <View {...pan.panHandlers}>
          <Svg
            width={w}
            height={520}
            accessibilityLabel={`Vertical lanes in ${unit}, centered on your distance`}
          >
            <Rect width={w} height={520} rx={20} fill="#edf2e8" />
            {ordered.map((l, i) => (
              <G key={l.id}>
                <Rect
                  x={i * lw}
                  y={48}
                  width={lw}
                  height={440}
                  fill={l.you ? "#d4ee8970" : "transparent"}
                />
                <Line
                  x1={i * lw}
                  x2={i * lw}
                  y1={48}
                  y2={488}
                  stroke="#ccd8c3"
                  strokeDasharray="4 8"
                />
                <SvgText
                  x={(i + 0.5) * lw}
                  y={28}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#768172"
                >
                  {l.you ? "YOU" : initialsFromName(l.name)}
                </SvgText>
              </G>
            ))}
            {Array.from(
              { length: 7 },
              (_, i) => bounds.min + (bounds.span * i) / 6,
            )
              .filter((n) => n >= 0)
              .map((n) => (
                <G key={n}>
                  <Line
                    x1={0}
                    x2={w - 42}
                    y1={y(n)}
                    y2={y(n)}
                    stroke="#cbd6c3"
                    strokeDasharray="2 6"
                  />
                  <SvgText x={w - 35} y={y(n) + 4} fontSize={9} fill="#768172">
                    {n.toFixed(v.span < 6 ? 1 : 0)}
                  </SvgText>
                </G>
              ))}
            {ordered.map((l, i) => {
              const value = l.values[index] ?? 0;
              const edge = arenaPosition(value, v).edge;
              const xx = (i + 0.5) * lw,
                yy = y(value);
              return (
                <G
                  key={l.id}
                  onPress={() => onSelect(l)}
                  accessible
                  accessibilityLabel={`${l.name}, ${value.toFixed(1)} ${unit}${edge ? `, ${edge} of view` : ""}`}
                >
                  <Circle cx={xx} cy={yy + 3} r={21} fill="#26382d15" />
                  <Circle
                    cx={xx}
                    cy={yy}
                    r={l.you ? 22 : 18}
                    fill={l.you ? "#26382d" : "#fff"}
                    stroke={l.you ? "#d4ee89" : "#cbd6c3"}
                    strokeWidth={l.you ? 4 : 1.5}
                  />
                  <SvgText
                    x={xx}
                    y={yy + 4}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight="bold"
                    fill={l.you ? "#f7faef" : "#26382d"}
                  >
                    {edge
                      ? edge === "ahead"
                        ? "↑"
                        : "↓"
                      : initialsFromName(l.name)}
                  </SvgText>
                  <SvgText
                    x={xx}
                    y={yy + 36}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#26382d"
                  >
                    {value.toFixed(1)}
                  </SvgText>
                </G>
              );
            })}
            {ghost && (
              <G onPress={() => onSelect(ghost)}>
                <Circle
                  cx={(ordered.findIndex((l) => l.you) + 0.5) * lw + 17}
                  cy={y(ghost.values[index] ?? 0)}
                  r={12}
                  fill="#ffffffbb"
                  stroke="#768172"
                  strokeDasharray="3 3"
                />
              </G>
            )}
            <SvgText x={w - 35} y={28} fontSize={9} fill="#768172">
              {unit}
            </SvgText>
            <SvgText x={14} y={507} fontSize={9} fill="#768172">
              Drag ↕ to explore · swipe ↔ across lanes
            </SvgText>
          </Svg>
        </View>
      </ScrollView>
    </View>
  );
}
