import { useMemo, useRef, useState, useEffect } from "react";
import { PanResponder, ScrollView, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import {
  arenaPosition,
  arenaWindow,
  clampArenaLaneCenter,
  orderedArenaLanes,
  initialsFromName,
  type ArenaLane,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
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
  const rawV = view ?? {
    center: me?.values[index] ?? 0,
    span: unit === "pts" ? 20 : unit === "mi" ? 4 : 6,
  };
  const effectiveCenter = clampArenaLaneCenter(rawV.center, rawV.span);
  const v =
    effectiveCenter === rawV.center
      ? rawV
      : { center: effectiveCenter, span: rawV.span };
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
            clampArenaLaneCenter(
              start.current + (g.dy / 400) * latest.current.v.span,
              latest.current.v.span,
            ),
          ),
      }),
    [],
  );
  const ordered = orderedArenaLanes(lanes);
  const ghost = showGhost ? lanes.find((l) => l.ghost) : null;
  const w = Math.max(width, ordered.length * 70 + 50),
    lw = (w - 50) / Math.max(1, ordered.length);
  const bounds = arenaWindow(v.center, v.span);
  const y = (value: number) => 72 + arenaPosition(value, v).fraction * 400;
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
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: "#eef3e8",
        borderWidth: 1,
        borderColor: "#d7e0cf",
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
            height={540}
            accessibilityLabel={`Vertical lanes in ${unit}, centered on your distance`}
          >
            <Defs>
              <LinearGradient id="road" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#f7faf3" />
                <Stop offset="0.5" stopColor="#eef3e8" />
                <Stop offset="1" stopColor="#e4ecdc" />
              </LinearGradient>
              <LinearGradient id="youLane" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#d4ee8966" />
                <Stop offset="1" stopColor="#d4ee8920" />
              </LinearGradient>
              <RadialGradient id="youGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#d4ee89" stopOpacity="0.55" />
                <Stop offset="1" stopColor="#d4ee89" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width={w} height={540} rx={24} fill="url(#road)" />
            <Rect
              x={10}
              y={56}
              width={w - 60}
              height={430}
              rx={18}
              fill="#ffffff55"
              stroke="#d7e0cf"
            />
            {ordered.map((l, i) => (
              <G key={l.id}>
                {l.you ? (
                  <Rect
                    x={i * lw + 10}
                    y={56}
                    width={lw}
                    height={430}
                    rx={14}
                    fill="url(#youLane)"
                  />
                ) : null}
                <Line
                  x1={i * lw + 10}
                  x2={i * lw + 10}
                  y1={64}
                  y2={476}
                  stroke={l.you ? "#b7c9a4" : "#ccd8c3"}
                  strokeWidth={l.you ? 1.5 : 1}
                  strokeDasharray={l.you ? undefined : "4 8"}
                />
                <SvgText
                  x={(i + 0.5) * lw + 10}
                  y={36}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={l.you ? "700" : "400"}
                  fill={l.you ? "#26382d" : "#768172"}
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
                    x1={18}
                    x2={w - 50}
                    y1={y(n)}
                    y2={y(n)}
                    stroke="#c5d2bb"
                    strokeDasharray="2 7"
                  />
                  <SvgText x={w - 42} y={y(n) + 4} fontSize={9} fill="#768172">
                    {n.toFixed(v.span < 6 ? 1 : 0)}
                  </SvgText>
                </G>
              ))}
            {bounds.min <= 0 && bounds.max >= 0 ? (
              <G>
                <Line
                  x1={18}
                  x2={w - 50}
                  y1={y(0)}
                  y2={y(0)}
                  stroke="#26382d"
                  strokeWidth={2}
                />
                <SvgText x={18} y={y(0) - 10} fontSize={9} fill="#768172">
                  START
                </SvgText>
              </G>
            ) : null}
            {ordered.map((l, i) => {
              const value = l.values[index] ?? 0;
              const edge = arenaPosition(value, v).edge;
              const xx = (i + 0.5) * lw + 10,
                yy = y(value);
              return (
                <G
                  key={l.id}
                  onPress={() => onSelect(l)}
                  accessible
                  accessibilityLabel={`${l.name}, ${value.toFixed(1)} ${unit}${edge ? `, ${edge} of view` : ""}`}
                >
                  {l.you ? (
                    <Circle cx={xx} cy={yy} r={34} fill="url(#youGlow)" />
                  ) : null}
                  <Circle cx={xx} cy={yy + 4} r={l.you ? 24 : 19} fill="#26382d18" />
                  <Circle
                    cx={xx}
                    cy={yy}
                    r={l.you ? 23 : 18}
                    fill={l.you ? "#26382d" : "#fff"}
                    stroke={l.you ? "#d4ee89" : "#c9d5bf"}
                    strokeWidth={l.you ? 4 : 2}
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
                  <Rect
                    x={xx - 24}
                    y={yy + 28}
                    width={48}
                    height={20}
                    rx={10}
                    fill={l.you ? "#26382d" : "#ffffffee"}
                    stroke="#d3ddcb"
                  />
                  <SvgText
                    x={xx}
                    y={yy + 42}
                    textAnchor="middle"
                    fontSize={10}
                    fill={l.you ? "#d4ee89" : "#26382d"}
                  >
                    {value.toFixed(1)}
                  </SvgText>
                </G>
              );
            })}
            {ghost && (
              <G onPress={() => onSelect(ghost)}>
                <Circle
                  cx={(ordered.findIndex((l) => l.you) + 0.5) * lw + 28}
                  cy={y(ghost.values[index] ?? 0)}
                  r={13}
                  fill="#ffffffcc"
                  stroke="#768172"
                  strokeDasharray="3 3"
                />
              </G>
            )}
            <SvgText x={w - 42} y={36} fontSize={9} fill="#768172">
              {unit}
            </SvgText>
            <SvgText x={18} y={522} fontSize={9} fill="#768172">
              Drag ↕ to explore · zoom keeps you centered
            </SvgText>
          </Svg>
        </View>
      </ScrollView>
    </View>
  );
}
