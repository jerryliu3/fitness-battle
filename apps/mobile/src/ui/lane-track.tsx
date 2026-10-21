import {
  fieldCourse, fieldCourseScene, fieldScaleScene, fieldLap, defaultFieldAppearance, type FieldAppearance,
  arenaPosition,
  arenaWindow,
  arenaFieldHigh,
  clampCourseCenter,
  initialsFromName,
  orderedArenaLanes,
  polishedLaneScale,
  selfLaneLabel,
  type ArenaLane,
  type ArenaOvertakeFrame,
  type ArenaOvertakePlan,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, ScrollView, Text, View } from "react-native";
import Svg, {
  Circle,
  G,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { SHELL_COLORS as c } from "../theme";
import { playCue } from "../lib/haptics";
import { drawFieldNode } from "./field-course";
import { LaneRacerTarget } from "./lane-racer-target";
import { Ember } from "./mascot/ember";
import { PolishedRacer, usePolishedWakeTime } from "./polished-racer";
export function LaneTrack({
  lanes,
  appearance = defaultFieldAppearance,
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
  appearance?: FieldAppearance;
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
  const prefix = useId();
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
  const clampCenter = (value: number, span: number) =>
    clampCourseCenter(value, span, fieldHigh, unit, appearance.ground);
  const effectiveCenter = clampCenter(rawV.center, rawV.span);
  const v =
    effectiveCenter === rawV.center
      ? rawV
      : { center: effectiveCenter, span: rawV.span };
  const course = useMemo(() => fieldCourse(width, 540, ordered.length, v, unit, appearance), [width, ordered.length, v.center, v.span, unit, appearance]);
  const latest = useRef({ v, onPan, exploring, clampCenter, length: course.length });
  latest.current = { v, onPan, exploring, clampCenter, length: course.length };
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
              start.current + (g.dy / latest.current.length) * latest.current.v.span,
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
  const w = course.width, lw = course.laneWidth;
  const live = ordered.map(l => ({ ...l, value: animating ? overtakeFrame?.laneValues[l.id] ?? l.values[index] ?? 0 : l.values[index] ?? 0, initials: initialsFromName(l.name) }));
  const groundPaint = useMemo(() => fieldCourseScene(course, appearance, live, unit, prefix).map(drawFieldNode), [course, appearance, lanes, index, overtakeFrame, unit, prefix]);
  const bounds = arenaWindow(v.center, v.span);
  const maxTailY = Math.min(482, bounds.min <= 0 && bounds.max >= 0 ? course.along(0) + 4 : 482);
  const previous = useRef<{ left: number; laneWidth: number; width: number; scroll: number; oval: boolean; count: number } | null>(null);
  useEffect(() => {
    const old = previous.current;
    const laneIndex = old && !old.oval && !course.oval && old.count === ordered.length ? (old.scroll + old.width / 2 - old.left) / old.laneWidth - .5 : Math.max(0, ordered.findIndex(l => l.you));
    const x = course.oval ? 0 : Math.max(0, Math.min(w - width, course.left + (laneIndex + .5) * lw - width / 2));
    scroll.current?.scrollTo({ x, animated: false });
    previous.current = { left: course.left, laneWidth: lw, width, scroll: x, oval: course.oval, count: ordered.length };
  }, [w, lw, width, course.left, course.oval]);
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
        onScroll={e => { if (previous.current) previous.current.scroll = e.nativeEvent.contentOffset.x; }}
        scrollEventThrottle={16}
      >
        <View {...pan.panHandlers}>
          <Svg
            width={w}
            height={540}
            accessibilityLabel={`Vertical lanes in ${unit}, centered on your distance`}
          >
            {groundPaint}
            {!course.oval && lw >= 48 && ordered.map((l, i) => <SvgText key={l.id} x={course.point(v.center, i).x} y={36} textAnchor="middle" fontSize={11} fontWeight={l.you ? "bold" : "600"} fill={l.you ? "#282f2c" : "#616c63"}>{l.you ? selfLaneLabel(l.name, "caps") : initialsFromName(l.name)}</SvgText>)}
            {ordered.map((l, i) => {
              const value =
                animating && overtakeFrame
                  ? (overtakeFrame.laneValues[l.id] ?? l.values[index] ?? 0)
                  : (l.values[index] ?? 0);
              const edge = !course.oval && arenaPosition(value, v).edge;
              const effect = !l.you
                ? overtakeFrame?.rivalEffects[l.id]
                : undefined;
              const speed =
                l.you && animating ? (overtakeFrame?.speed ?? 0) : 0;
              const charging =
                l.you && animating ? (overtakeFrame?.charging ?? 0) : 0;
              const point = course.point(value, i, 0, true), scale = course.markerScale;
              const xx = point.x + (effect?.joltX ?? 0) * scale, yy = point.y + (l.you ? charging * 4 * scale : 0);
              const headHalf = 29 * polishedLaneScale(l.you);
              return (
                <LaneRacerTarget
                  key={l.id}
                  onPress={() => onSelect(l)}
                  accessible
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedId === l.id }}
                  accessibilityLabel={`${course.oval ? `${fieldLap(value, unit).laps} completed laps, ` : ""}${l.name}, ${(value - (overtakeFrame?.youValue ?? me?.values[index] ?? 0)).toFixed(1)} ${unit} relative to you${edge ? `, ${edge} of view` : ""}`}
                >
                  <G transform={`translate(${xx} ${yy}) rotate(${point.angle}) scale(${scale})`}>
                  {l.id === leaderId && !edge ? (
                    <G transform={`translate(-24, -104)`}>
                      <Ember size={48} expression="joy" />
                    </G>
                  ) : null}
                  {l.you && charging > 0.02 ? (
                    <Path
                      d={`M ${-30} ${-4} l -8 6 l 5 2 l -5 7 M ${30} ${-6} l 8 6 l -5 2 l 5 7`}
                      fill="none"
                      stroke="#f1c75b"
                      strokeWidth={2}
                      strokeLinecap="round"
                      opacity={charging}
                    />
                  ) : null}
                  {effect?.isPassed && effect.ripple < 1 ? (
                    <Circle
                      cx={0}
                      cy={0}
                      r={19 + effect.ripple * 24}
                      fill="none"
                      stroke="#f1c75b"
                      strokeWidth={3 - effect.ripple * 2}
                      opacity={1 - effect.ripple}
                    />
                  ) : null}
                  {edge ? (
                    <Circle
                      cx={0}
                      cy={0}
                      r={18}
                      fill="white"
                      stroke="#616c63"
                      strokeDasharray="3 3"
                    />
                  ) : (
                    <PolishedRacer
                      x={0}
                      y={0}
                      you={l.you}
                      wakeBottom={course.oval ? undefined : (maxTailY - yy) / scale}
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
                    x={-24 / scale}
                    y={-Math.max(22 / scale, headHalf + 4)}
                    width={48 / scale}
                    height={Math.max(44 / scale, headHalf * 2 + 8)}
                    rx={24}
                    fill="transparent"
                  />
                  <SvgText
                    x={0}
                    y={4}
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
                        x={-32}
                        y={-headHalf - 26}
                        width={64}
                        height={20}
                        rx={10}
                        fill="#ffffffee"
                        stroke="#e0e5dc"
                      />
                      <SvgText
                        x={0}
                        y={-headHalf - 12}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#282f2c"
                      >
                        {`${value - (overtakeFrame?.youValue ?? ordered.find((peer) => peer.you)?.values[index] ?? 0) > 0 ? "+" : ""}${(value - (overtakeFrame?.youValue ?? ordered.find((peer) => peer.you)?.values[index] ?? 0)).toFixed(1)} ${unit}`}
                      </SvgText>
                    </>
                  )}
                  </G>
                </LaneRacerTarget>
              );
            })}
            {ghost && (() => { const p = course.point(ghost.values[index] ?? 0, ordered.findIndex(l => l.you), 18 * course.markerScale, true); return <G onPress={() => onSelect(ghost)}><Circle cx={p.x} cy={p.y} r={13} fill="#ffffffcc" stroke="#616c63" strokeDasharray="3 3"/></G>; })()}
            <SvgText x={18} y={522} fontSize={9} fill="#616c63">
              {course.oval ? `${fieldLap(overtakeFrame?.youValue ?? me?.values[index] ?? 0, unit).laps} laps · ${(overtakeFrame?.youValue ?? me?.values[index] ?? 0).toFixed(1)} ${unit} total` : exploring
                ? "Drag vertically to explore · Done to scroll page"
                : "Swipe across peers · tap an athlete to center"}
            </SvgText>
          </Svg>
        </View>
      </ScrollView>
      {!course.oval && <Svg width={42} height={540} pointerEvents="none" style={{ position: "absolute", top: 52, right: 0 }}>{fieldScaleScene(course, unit).map(drawFieldNode)}</Svg>}
    </View>
  );
}
