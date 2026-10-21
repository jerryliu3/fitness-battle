import {
  arenaPosition,
  arenaWindow,
  arenaFieldHigh,
  clampArenaLaneCenter,
  clampArenaLaneCenterToField,
  initialsFromName,
  orderedArenaLanes,
  polishedLaneScale,
  selfLaneLabel,
  type ArenaLane,
  type ArenaOvertakeFrame,
  type ArenaOvertakePlan,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, ScrollView, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { SHELL_COLORS as c } from "../theme";
import { playCue } from "../lib/haptics";
import { Ember } from "./mascot/ember";
import { PolishedRacer, usePolishedWakeTime } from "./polished-racer";
export function LaneTrack({
  lanes,
  unit,
  showGhost,
  selectedId,
  index,
  onSelect,
  view,
  onPan,
  overtakeFrame = null,
  overtakePlan = null,
  active = true,
}: {
  active?: boolean;
  lanes: ArenaLane[];
  unit: string;
  showGhost: boolean;
  selectedId?: string;
  index: number;
  onSelect: (lane: ArenaLane) => void;
  view?: ArenaViewWindow;
  onPan?: (center: number) => void;
  overtakeFrame?: ArenaOvertakeFrame | null;
  overtakePlan?: ArenaOvertakePlan | null;
}) {
  const [exploring, setExploring] = useState(false);
  const [width, setWidth] = useState(340);
  const wakeTime = usePolishedWakeTime(active);
  const scroll = useRef<ScrollView>(null);
  const animating = Boolean(overtakeFrame && overtakeFrame.phase !== "done");
  const me = lanes.find((l) => l.you);
  const rawV = view ?? {
    center: me?.values[index] ?? 0,
    span: unit === "pts" ? 20 : unit === "mi" ? 4 : 6,
  };
  const ordered = orderedArenaLanes(lanes);
  const fieldHigh = arenaFieldHigh(
    ordered.map((lane) => ({ value: lane.values[index], ghost: lane.ghost })),
  );
  const aheadPad = unit === "pts" ? 20 : 8;
  const clampCenter = (value: number, span: number) =>
    clampArenaLaneCenterToField(value, span, fieldHigh, aheadPad);
  const effectiveCenter = clampCenter(rawV.center, rawV.span);
  const v =
    effectiveCenter === rawV.center
      ? rawV
      : { center: effectiveCenter, span: rawV.span };
  const latest = useRef({ v, onPan, exploring, clampCenter });
  latest.current = { v, onPan, exploring, clampCenter };
  const start = useRef(v.center);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          latest.current.exploring &&
          Math.abs(g.dy) > 7 &&
          Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => {
          start.current = latest.current.v.center;
        },
        onPanResponderMove: (_, g) =>
          latest.current.onPan?.(
            latest.current.clampCenter(
              start.current + (g.dy / 400) * latest.current.v.span,
              latest.current.v.span,
            ),
          ),
      }),
    [],
  );
  const ranked = [...ordered].sort((a, b) => b.values[index] - a.values[index]);
  const leaderId =
    ranked[0]?.values[index] > 0 &&
    (!ranked[1] || ranked[0].values[index] > ranked[1].values[index])
      ? ranked[0].id
      : null;
  const ghost = showGhost ? lanes.find((l) => l.ghost) : null;
  const w = Math.max(width, ordered.length * 70 + 50),
    lw = (w - 50) / Math.max(1, ordered.length);
  const bounds = arenaWindow(v.center, v.span);
  const y = (value: number) => 72 + arenaPosition(value, v).fraction * 400;
  const maxTailY = Math.min(
    482,
    bounds.min <= 0 && bounds.max >= 0 ? y(0) + 4 : 482,
  );
  useEffect(() => {
    scroll.current?.scrollTo({
      x: Math.max(
        0,
        Math.min(
          w - width,
          10 +
            (Math.max(
              0,
              ordered.findIndex((lane) => lane.you),
            ) +
              0.5) *
              lw -
            width / 2,
        ),
      ),
      animated: false,
    });
  }, [w, width]);
  return (
    <View
      onLayout={(e) => {
        if (e.nativeEvent.layout.width > 0)
          setWidth(e.nativeEvent.layout.width);
      }}
      style={{
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: "#eef3e8",
        borderWidth: 1,
        borderColor: "#d7e0cf",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 4,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontFamily: "DMSans_400Regular",
            fontSize: 11,
            lineHeight: 16,
            color: c.muted,
          }}
        >
          {exploring ? "Drag vertically to explore" : "Swipe across peers"}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: exploring }}
          accessibilityLabel={
            exploring ? "Finish panning lanes" : "Enable vertical lane panning"
          }
          onPress={() => {
            void playCue("selection");
            setExploring((value) => !value);
          }}
          style={{
            minHeight: 44,
            paddingHorizontal: 12,
            justifyContent: "center",
            borderRadius: 10,
            backgroundColor: exploring ? c.tennis : "#ffffff99",
          }}
        >
          <Text
            style={{
              fontFamily: "DMSans_500Medium",
              fontSize: 12,
              color: c.ink,
            }}
          >
            {exploring ? "Done" : "Explore"}
          </Text>
        </Pressable>
      </View>
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
                <Stop offset="0" stopColor="#f1c75b66" />
                <Stop offset="1" stopColor="#f1c75b20" />
              </LinearGradient>
              <RadialGradient id="youGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#f1c75b" stopOpacity="0.55" />
                <Stop offset="1" stopColor="#f1c75b" stopOpacity="0" />
              </RadialGradient>
              <LinearGradient id="afterburnWake" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#f1c75b" stopOpacity="0.65" />
                <Stop offset="0.45" stopColor="#f1c75b" stopOpacity="0.28" />
                <Stop offset="1" stopColor="#f1c75b" stopOpacity="0" />
              </LinearGradient>
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
                    fill="url(#youLane)"
                    rx={14}
                  />
                ) : null}
                <Line
                  x1={i * lw + 10}
                  x2={i * lw + 10}
                  y1={64}
                  y2={476}
                  stroke={l.you ? "#b7c9a4" : "#d3ddcb"}
                  strokeWidth={l.you ? 1.5 : 1}
                  strokeDasharray={l.you ? "0" : "5 9"}
                />
                <SvgText
                  x={(i + 0.5) * lw + 10}
                  y={36}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={l.you ? "bold" : "600"}
                  fill={l.you ? "#282f2c" : "#616c63"}
                >
                  {l.you
                    ? selfLaneLabel(l.name, "caps")
                    : initialsFromName(l.name)}
                </SvgText>
              </G>
            ))}
            {Array.from(
              { length: 7 },
              (_, i) => bounds.min + (bounds.span * i) / 6,
            )
              .filter((v) => v >= 0)
              .map((v) => (
                <G key={v}>
                  <Line
                    x1={18}
                    x2={w - 50}
                    y1={y(v)}
                    y2={y(v)}
                    stroke="#c5d2bb"
                    strokeDasharray="2 7"
                  />
                  <SvgText x={w - 42} y={y(v) + 4} fontSize={9} fill="#616c63">
                    {v.toFixed(unit === "pts" ? 0 : 1)}
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
                  stroke="#282f2c"
                  strokeWidth={2}
                />
                <SvgText x={18} y={y(0) - 10} fontSize={9} fill="#616c63">
                  START
                </SvgText>
              </G>
            ) : null}
            {ordered.map((l, i) => {
              const value =
                animating && overtakeFrame
                  ? (overtakeFrame.laneValues[l.id] ?? l.values[index] ?? 0)
                  : (l.values[index] ?? 0);
              const edge = arenaPosition(value, v).edge;
              const effect = !l.you
                ? overtakeFrame?.rivalEffects[l.id]
                : undefined;
              const speed =
                l.you && animating ? (overtakeFrame?.speed ?? 0) : 0;
              const charging =
                l.you && animating ? (overtakeFrame?.charging ?? 0) : 0;
              const xx = (i + 0.5) * lw + 10 + (effect?.joltX ?? 0),
                yy = y(value) + (l.you ? charging * 4 : 0);
              const headHalf = 29 * polishedLaneScale(l.you);
              return (
                <G
                  key={l.id}
                  onPress={() => onSelect(l)}
                  accessible
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedId === l.id }}
                  accessibilityLabel={`${l.name}, ${(value - (overtakeFrame?.youValue ?? me?.values[index] ?? 0)).toFixed(1)} ${unit} relative to you${edge ? `, ${edge} of view` : ""}`}
                >
                  {l.id === leaderId && !edge ? (
                    <G transform={`translate(${xx - 24}, ${yy - 104})`}>
                      <Ember size={48} expression="joy" />
                    </G>
                  ) : null}
                  {l.you && charging > 0.02 ? (
                    <Path
                      d={`M ${xx - 30} ${yy - 4} l -8 6 l 5 2 l -5 7 M ${xx + 30} ${yy - 6} l 8 6 l -5 2 l 5 7`}
                      fill="none"
                      stroke="#f1c75b"
                      strokeWidth={2}
                      strokeLinecap="round"
                      opacity={charging}
                    />
                  ) : null}
                  {effect?.isPassed && effect.ripple < 1 ? (
                    <Circle
                      cx={xx}
                      cy={yy}
                      r={19 + effect.ripple * 24}
                      fill="none"
                      stroke="#f1c75b"
                      strokeWidth={3 - effect.ripple * 2}
                      opacity={1 - effect.ripple}
                    />
                  ) : null}
                  {edge ? (
                    <Circle
                      cx={xx}
                      cy={yy}
                      r={18}
                      fill="white"
                      stroke="#616c63"
                      strokeDasharray="3 3"
                    />
                  ) : (
                    <PolishedRacer
                      x={xx}
                      y={yy}
                      you={l.you}
                      wakeBottom={maxTailY - yy}
                      gold={
                        !ordered.some(
                          (peer) =>
                            (overtakeFrame?.laneValues[peer.id] ??
                              peer.values[index]) > value,
                        )
                      }
                      time={wakeTime}
                    />
                  )}

                  <Rect
                    x={xx - 24}
                    y={yy - headHalf - 4}
                    width={48}
                    height={headHalf * 2 + 8}
                    rx={24}
                    fill="transparent"
                  />
                  <SvgText
                    x={xx}
                    y={yy + 4}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight="bold"
                    fill="#282f2c"
                  >
                    {edge
                      ? edge === "ahead"
                        ? "↑"
                        : "↓"
                      : initialsFromName(l.name)}
                  </SvgText>
                  {!l.you && (
                    <>
                      <Rect
                        x={xx - 32}
                        y={yy - headHalf - 26}
                        width={64}
                        height={20}
                        rx={10}
                        fill="#ffffffee"
                        stroke="#e0e5dc"
                      />
                      <SvgText
                        x={xx}
                        y={yy - headHalf - 12}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#282f2c"
                      >
                        {`${value - (overtakeFrame?.youValue ?? ordered.find((peer) => peer.you)?.values[index] ?? 0) > 0 ? "+" : ""}${(value - (overtakeFrame?.youValue ?? ordered.find((peer) => peer.you)?.values[index] ?? 0)).toFixed(1)} ${unit}`}
                      </SvgText>
                    </>
                  )}
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
                  stroke="#616c63"
                  strokeDasharray="3 3"
                />
              </G>
            )}
            <SvgText x={w - 42} y={36} fontSize={9} fill="#616c63">
              {unit}
            </SvgText>
            <SvgText x={18} y={522} fontSize={9} fill="#616c63">
              {exploring
                ? "Drag vertically to explore · Done to scroll page"
                : "Swipe across peers · tap an athlete to center"}
            </SvgText>
          </Svg>
        </View>
      </ScrollView>
    </View>
  );
}
