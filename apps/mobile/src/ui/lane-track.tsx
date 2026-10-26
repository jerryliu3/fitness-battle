import { chartTextProps, textStyle  } from "./section";
import {
  fieldCourse, fieldCourseScene, fieldLap, defaultFieldAppearance, type FieldAppearance,
  fieldZoomSpan, pinchFieldView,
  arenaPosition,
  arenaWindow,
  fieldDefaultSpan,
  ordinalPlace,
  athletePennantOffset,
  PERSON_ICON_PATH,
  arenaFieldHigh,
  clampCourseCenter,
  initialsFromName,
  orderedArenaLanes,
  competeAthleteTrailColors,
  competeFieldIncludesStart,
  competeStartTrailVector,
  fieldLaneMarkerScale,
  type ArenaLane,
  type ArenaOvertakeFrame,
  type ArenaOvertakePlan,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
import { memo, useEffect, useId, useMemo, useRef, useState, type ComponentRef, type MutableRefObject } from "react";
import { PanResponder, Pressable, ScrollView, Text, View, type ScrollViewInstance } from "react-native";
import Svg, {
  Circle,
  Line,
  Defs,
  ClipPath,
  Image as SvgImage,
  G,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { SHELL_COLORS as c } from "../theme";
import { playCue } from "../lib/haptics";
import { drawFieldNode } from "./field-course";
import { LaneRacerTarget } from "./lane-racer-target";
import { PolishedRacer } from "./polished-racer";
import { useWakeAnimation } from "./use-wake-animation";
export interface LaneAnchor { left: number; laneWidth: number; width: number; scroll: number; oval: boolean; count: number }

function LaneTrackContent({
  lanes,
  appearance = defaultFieldAppearance,
  unit,
  showGhost,
  selectedId,
  focusOnMount = false,
  followSelected = false,
  animateSelection = true,
  index,
  onSelect,
  view,
  onPan,
  overtakeFrame = null,
  overtakePlan = null,
  active = true,
  topInset = 0,
  height = 540,
  fullscreen = false,
  onExpand,
  onToggleDimension,
  onZoom,
  anchor,
  focusRequest = 0,
  onViewChange,
  onGestureStart,
}: {
  focusRequest?: number;
  onViewChange?: (view: ArenaViewWindow) => void;
  onGestureStart?: () => void;
  height?: number;
  fullscreen?: boolean;
  onExpand?: () => void;
  onToggleDimension?: () => void;
  onZoom?: (span: number) => void;
  anchor?: MutableRefObject<LaneAnchor | null>;
  appearance?: FieldAppearance;
  active?: boolean;
  /** Reserve room for an overlaid field status without covering lane headers. */
  topInset?: number;
  lanes: ArenaLane[];
  unit: string;
  showGhost: boolean;
  selectedId?: string;
  focusOnMount?: boolean;
  /** Lock the horizontal camera to the athlete during passive playback. */
  followSelected?: boolean;
  animateSelection?: boolean;
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
  const [interacting, setInteracting] = useState(false);
  const wakeAnimation = useWakeAnimation(active && (exploring || fullscreen) && !interacting);
  const [visibleScroll, setVisibleScroll] = useState(anchor?.current?.scroll ?? 0);
  const scroll = useRef<ScrollViewInstance>(null);
  const surface = useRef<ComponentRef<typeof View>>(null);
  const scrollAfterZoom = useRef<number | null>(null);
  const animating = Boolean(overtakeFrame && overtakeFrame.phase !== "done");
  const me = lanes.find((l) => l.you);
  const rawV = view ?? {
    center: me?.values[index] ?? 0,
    span: fieldDefaultSpan(unit),
  };
  const ordered = useMemo(() => orderedArenaLanes(lanes), [lanes]);
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
  const course = useMemo(() => fieldCourse(width, height, ordered.length, v, unit, appearance), [width, height, ordered.length, v.center, v.span, unit, appearance]);
  const latest = useRef({ v, onPan, onZoom, onViewChange, onGestureStart, exploring: exploring || fullscreen, clampCenter, course, width, height, unit, appearance, count: ordered.length });
  latest.current = { v, onPan, onZoom, onViewChange, onGestureStart, exploring: exploring || fullscreen, clampCenter, course, width, height, unit, appearance, count: ordered.length };
  const pending = useRef<{ view: ArenaViewWindow; scroll: number } | null>(null);
  const frame = useRef<number | null>(null);
  const start = useRef({ view: v, x: 0, y: 0, top: 0, left: 0, distance: 0, count: 1, scroll: 0 });
  const publish = () => {
    frame.current = null;
    const next = pending.current; pending.current = null;
    if (!next) return;
    const p = latest.current;
    if (next.view.span !== p.v.span) scrollAfterZoom.current = next.scroll;
    else scroll.current?.scrollTo({ x: next.scroll, animated: false });
    if (previous.current) previous.current.scroll = next.scroll;
    setVisibleScroll(next.scroll);
    if (p.onViewChange) p.onViewChange(next.view);
    else { if (next.view.span !== p.v.span) p.onZoom?.(next.view.span); p.onPan?.(next.view.center); }
  };
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: e => e.nativeEvent.touches.length >= 2,
    onStartShouldSetPanResponder: e => e.nativeEvent.touches.length >= 2,
    onMoveShouldSetPanResponderCapture: (e, g) => e.nativeEvent.touches.length >= 2 || latest.current.exploring && Math.hypot(g.dx, g.dy) > 4,
    onMoveShouldSetPanResponder: (e, g) => e.nativeEvent.touches.length >= 2 || latest.current.exploring && Math.hypot(g.dx, g.dy) > 4,
    onPanResponderGrant: e => {
      latest.current.onGestureStart?.(); setInteracting(true);
      scroll.current?.scrollTo({ x: previous.current?.scroll ?? 0, animated: false });
      const touches = e.nativeEvent.touches, a = touches[0], b = touches[1];
      if (!a) return;
      start.current = { view: latest.current.v, x: (a.pageX + (b?.pageX ?? a.pageX)) / 2, y: (a.pageY + (b?.pageY ?? a.pageY)) / 2, top: e.nativeEvent.pageY - e.nativeEvent.locationY, left: e.nativeEvent.pageX - e.nativeEvent.locationX, distance: b ? Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY) : 0, count: b ? 2 : 1, scroll: previous.current?.scroll ?? 0 };
      surface.current?.measureInWindow((left: number, top: number) => { start.current.left = left; start.current.top = top; });
    },
    onPanResponderMove: e => {
      const p = latest.current, d = start.current, touches = e.nativeEvent.touches, a = touches[0], b = touches[1];
      if (!a) return;
      const count = b ? 2 : 1, x = (a.pageX + (b?.pageX ?? a.pageX)) / 2, y = (a.pageY + (b?.pageY ?? a.pageY)) / 2;
      const distance = b ? Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY) : 0;
      if (count !== d.count) { start.current = { ...d, x, y, count, distance, view: pending.current?.view ?? p.v, scroll: pending.current?.scroll ?? previous.current?.scroll ?? 0 }; return; }
      const span = count === 2 && distance > 0 && d.distance > 0 ? fieldZoomSpan(d.view.span * d.distance / distance, p.unit) : d.view.span;
      const next = pinchFieldView(d.view, span, (d.y - d.top - p.course.top) / p.course.length, (y - d.top - p.course.top) / p.course.length);
      next.center = p.clampCenter(next.center, next.span);
      const fromCourse = fieldCourse(p.width, p.height, p.count, d.view, p.unit, p.appearance);
      const nextCourse = fieldCourse(p.width, p.height, p.count, next, p.unit, p.appearance);
      const scrollX = count === 2 ? nextCourse.left + (d.scroll + d.x - d.left - fromCourse.left) / fromCourse.laneWidth * nextCourse.laneWidth - (x - d.left) : d.scroll - (x - d.x);
      pending.current = { view: next, scroll: Math.max(0, Math.min(nextCourse.width - p.width, scrollX)) };
      if (frame.current === null) frame.current = requestAnimationFrame(publish);
    },
    onPanResponderRelease: () => { if (frame.current !== null) cancelAnimationFrame(frame.current); publish(); setInteracting(false); },
    onPanResponderTerminate: () => { if (frame.current !== null) cancelAnimationFrame(frame.current); publish(); setInteracting(false); },
    onPanResponderTerminationRequest: () => false,
  }), []);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  const ghost = showGhost ? lanes.find((l) => l.ghost) : null;
  const w = course.width, lw = course.laneWidth;
  const live = ordered.map(l => ({ ...l, value: animating ? overtakeFrame?.laneValues[l.id] ?? l.values[index] ?? 0 : l.values[index] ?? 0, initials: initialsFromName(l.name) }));
  const firstVisible = Math.max(0, Math.floor((visibleScroll - course.left) / lw) - 2);
  const lastVisible = Math.min(ordered.length - 1, Math.ceil((visibleScroll + width - course.left) / lw) + 2);
  const groundPaint = useMemo(() => fieldCourseScene(course, appearance, live, unit, prefix, { first: firstVisible, last: lastVisible }).map(drawFieldNode), [course, appearance, lanes, index, overtakeFrame, unit, prefix, firstVisible, lastVisible]);
  const bounds = arenaWindow(v.center, v.span);
  const maxTailY = Math.min(height, bounds.min <= 0 && bounds.max >= 0 ? course.along(0) + 4 : height);
  const localAnchor = useRef<LaneAnchor | null>(null);
  const previous = anchor ?? localAnchor;
  const prevSelectedRef = useRef(focusOnMount ? "" : `${selectedId}:${focusRequest}`);
  useEffect(() => {
    const old = previous.current;
    const laneIndex = followSelected ? Math.max(0, ordered.findIndex(l => l.id === selectedId)) : old && !old.oval && !course.oval && old.count === ordered.length ? (old.scroll + old.width / 2 - old.left) / old.laneWidth - .5 : Math.max(0, ordered.findIndex(l => l.you));
    const x = course.oval ? 0 : scrollAfterZoom.current ?? Math.max(0, Math.min(w - width, course.left + (laneIndex + .5) * lw - width / 2));
    scrollAfterZoom.current = null;
    scroll.current?.scrollTo({ x, animated: false });
    setVisibleScroll(x);
    previous.current = { left: course.left, laneWidth: lw, width, scroll: x, oval: course.oval, count: ordered.length };
  }, [w, lw, width, course.left, course.oval, followSelected, selectedId]);
  useEffect(() => {
    const key = `${selectedId}:${focusRequest}`;
    if (!selectedId || key === prevSelectedRef.current || course.oval) {
      prevSelectedRef.current = key;
      return;
    }
    prevSelectedRef.current = key;
    const laneIndex = ordered.findIndex((l) => l.id === selectedId);
    if (laneIndex < 0) return;
    const x = Math.max(0, Math.min(w - width, course.left + (laneIndex + 0.5) * lw - width / 2));
    scroll.current?.scrollTo({ x, animated: animateSelection });
    previous.current = { left: course.left, laneWidth: lw, width, scroll: x, oval: course.oval, count: ordered.length };
  }, [selectedId, focusRequest, w, lw, width, course.left, course.oval, ordered.length]);
  return (
    <View
      onLayout={(e) => {
        if (e.nativeEvent.layout.width > 0)
          setWidth(e.nativeEvent.layout.width);
      }}
      style={{
        position: "relative",
        borderRadius: fullscreen ? 0 : 24,
        overflow: "hidden",
        backgroundColor: "#14311e",
        borderWidth: fullscreen ? 0 : 1,
        borderColor: "#d7e0cf",
      }}
    >
      <View ref={surface} {...pan.panHandlers}>
      <ScrollView
        horizontal
        scrollEnabled={!fullscreen && !exploring && !interacting}
        ref={scroll}
        nestedScrollEnabled
        pinchGestureEnabled={false}
        showsHorizontalScrollIndicator
        contentContainerStyle={{ paddingTop: topInset }}
        onScroll={e => { const x = e.nativeEvent.contentOffset.x; if (previous.current) previous.current.scroll = x; setVisibleScroll(x); }}
        scrollEventThrottle={16}
      >
        <View>
          <Svg
            width={w}
            height={height}
            accessibilityLabel={`Vertical lanes in ${unit}, centered on your distance`}
          >
            {fullscreen ? <G>{groundPaint}</G> : <LaneRacerTarget onPress={onExpand} accessibilityLabel="Expand 2D map to full screen">{groundPaint}</LaneRacerTarget>}
            {ordered.map((l, i) => {
              if (!course.oval && (i < firstVisible || i > lastVisible)) return null;
              const value =
                animating && overtakeFrame
                  ? (overtakeFrame.laneValues[l.id] ?? l.values[index] ?? 0)
                  : (l.values[index] ?? 0);
              const edge = !course.oval && arenaPosition(value, v).edge;
              const effect = overtakeFrame?.rivalEffects[l.id];
              const charging =
                l.you && animating ? (overtakeFrame?.charging ?? 0) : 0;
              const point = course.point(value, i, 0, true);
              const startPoint = course.point(0, i, 0, true);
              const scale = edge ? 1 : course.markerScale;
              const xx = point.x + (effect?.joltX ?? 0) * scale;
              const yy = point.y + (l.you ? charging * 4 * scale : 0);
              const showStartTrail =
                !course.oval &&
                !edge &&
                value > 0.0001 && // at the start line the athlete sits on the marker; no connector
                competeFieldIncludesStart(v);
              const trailColors = competeAthleteTrailColors(Boolean(l.you), Boolean(l.ghost));
              const startTrail = showStartTrail
                ? competeStartTrailVector(xx, yy, startPoint.x, startPoint.y)
                : null;
              const headHalf = 29 * fieldLaneMarkerScale(Boolean(l.you));
              const rank=1+live.filter(peer=>peer.value>value+.000001).length;
              const pennantWidth=146, visibleLeft=previous.current?.scroll??0;
              const pennantX=Math.max(visibleLeft-xx+8,Math.min(visibleLeft+width-xx-pennantWidth-8,l.you?-pennantWidth-12:12));
              const pennantY=athletePennantOffset(yy,course.point(overtakeFrame?.youValue??me?.values[index]??0,Math.max(0,ordered.findIndex(peer=>peer.you)),0,true).y,l.you,height);
              return (
                <G key={l.id}>
                  {startTrail ? (
                    <G pointerEvents="none">
                      <Line
                        x1={xx}
                        y1={yy}
                        x2={xx + startTrail.dx}
                        y2={yy + startTrail.dy}
                        stroke={trailColors.stroke}
                        strokeWidth={trailColors.strokeWidth}
                        strokeLinecap="round"
                        opacity={trailColors.strokeOpacity}
                      />
                      <Circle
                        cx={xx}
                        cy={yy}
                        r={6}
                        fill={trailColors.dotFill}
                        stroke={trailColors.dotStroke}
                        strokeWidth={3}
                      />
                    </G>
                  ) : null}
                <LaneRacerTarget
                  onPress={() => onSelect(l)}
                  accessible
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedId === l.id }}
                  accessibilityLabel={`${course.oval ? `${fieldLap(value, unit).laps} completed laps, ` : ""}${l.name}, ${(value - (overtakeFrame?.youValue ?? me?.values[index] ?? 0)).toFixed(1)} ${unit} relative to you${edge ? `, ${edge} of view` : ""}`}
                >
                  <G transform={`translate(${xx} ${yy}) rotate(${point.angle}) scale(${scale})`}>
                  {l.you && charging > 0.02 ? (
                    <Path
                      d={`M ${-30} ${-4} l -8 6 l 5 2 l -5 7 M ${30} ${-6} l 8 6 l -5 2 l 5 7`}
                      fill="none"
                      stroke={c.tennis}
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
                      stroke={c.tennis}
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
                      stroke={c.muted}
                      strokeDasharray="3 3"
                    />
                  ) : (
                    <PolishedRacer
                      sizeScale={fieldLaneMarkerScale(Boolean(l.you))}
                      x={0}
                      y={0}
                      you={l.you}
                      showWake={!showStartTrail}
                      animation={wakeAnimation}
                      wakeBottom={course.oval ? undefined : (maxTailY - yy) / scale}
                      gold={
                        !ordered.some(
                          (peer) =>
                            (overtakeFrame?.laneValues[peer.id] ??
                              peer.values[index]) > value,
                        )
                      }
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
                  {edge?<SvgText {...chartTextProps()} x={0} y={4} textAnchor="middle"  fill={c.ink}>{edge==="ahead"?"↑":"↓"}</SvgText>:null}
                  </G>
                  {edge?<G transform={`translate(${xx} ${yy})`} pointerEvents="none"><Rect x={-34} y={edge==="ahead"?27:-42} width={68} height={20} rx={8} fill="#ffffffee"/><SvgText {...chartTextProps()} x={0} y={edge==="ahead"?41:-28} textAnchor="middle"  fill={c.muted}>{`${value-(overtakeFrame?.youValue??me?.values[index]??0)>0?"+":""}${(value-(overtakeFrame?.youValue??me?.values[index]??0)).toFixed(1)} ${unit}`}</SvgText></G>:null}
                  {!edge&&(l.you||selectedId===l.id)?<G transform={`translate(${xx} ${yy})`} pointerEvents="none">
                    <Path d={`M0 0 L${pennantX+pennantWidth/2} ${pennantY>0?pennantY:pennantY+46}`} fill="none" stroke={c.secondary} strokeWidth={1.2}/>
                    <Rect x={pennantX} y={pennantY+2} width={pennantWidth} height={46} rx={12} fill={c.ink} opacity={.1}/>
                    <Rect x={pennantX} y={pennantY} width={pennantWidth} height={46} rx={12} fill={c.card} stroke={l.you?c.tennis:c.line}/>
                    <Circle cx={pennantX+24} cy={pennantY+23} r={16} fill={c.soft}/>
                    {l.avatarUrl?<><Defs><ClipPath id={`${prefix}-portrait-${i}`}><Circle cx={pennantX+24} cy={pennantY+23} r={16}/></ClipPath></Defs><SvgImage href={{uri:l.avatarUrl}} x={pennantX+8} y={pennantY+7} width={32} height={32} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${prefix}-portrait-${i})`}/></>:<Path d={PERSON_ICON_PATH} transform={`translate(${pennantX+14} ${pennantY+13}) scale(.83)`} fill="none" stroke={c.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>}
                    <SvgText {...chartTextProps()} x={pennantX+47} y={pennantY+20}  fill={c.ink} >{l.you?"You":l.name.length>13?`${l.name.slice(0,12)}…`:l.name}</SvgText>
                    <SvgText {...chartTextProps()} x={pennantX+47} y={pennantY+35}  fill={c.muted}>{ordinalPlace(rank)} · {l.you?`${value.toFixed(1)} ${unit}`:`${value-(overtakeFrame?.youValue??me?.values[index]??0)>0?"+":""}${(value-(overtakeFrame?.youValue??me?.values[index]??0)).toFixed(1)} ${unit}`}</SvgText>
                  </G>:null}
                </LaneRacerTarget>
                </G>
              );
            })}
            {ghost && (() => { const p = course.point(ghost.values[index] ?? 0, ordered.findIndex(l => l.you), 18 * course.markerScale, true); return <G onPress={() => onSelect(ghost)}><Circle cx={p.x} cy={p.y} r={13 * course.markerScale} fill="#ffffffcc" stroke={c.muted} strokeDasharray="3 3"/></G>; })()}
          </Svg>
        </View>
      </ScrollView>
      </View>
      {!fullscreen ? (
        <View
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          {onToggleDimension ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch to 3D field"
              onPress={onToggleDimension}
              style={{
                minHeight: 36,
                paddingHorizontal: 12,
                justifyContent: "center",
                borderRadius: 999,
                backgroundColor: "rgba(20, 20, 19, 0.78)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.2)",
              }}
            >
              <Text style={{ ...textStyle("caption"), color: "#ffffff" }}>
                2D
              </Text>
            </Pressable>
          ) : null}
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
              minHeight: 36,
              paddingHorizontal: 14,
              justifyContent: "center",
              borderRadius: 999,
              backgroundColor: exploring ? c.tennis : "rgba(20, 20, 19, 0.75)",
              borderWidth: 1,
              borderColor: exploring ? c.tennis : "rgba(255, 255, 255, 0.16)",
            }}
          >
            <Text
              style={{
                ...textStyle("caption"),
                color: exploring ? c.ink : "#ffffff",
              }}
            >
              {exploring ? "Done" : "Explore"}
            </Text>
          </Pressable>
          {onExpand ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Expand 2D map to full screen"
              onPress={onExpand}
              style={{
                minHeight: 36,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderRadius: 999,
                backgroundColor: "rgba(20, 20, 19, 0.85)",
                borderWidth: 1,
                borderColor: "rgba(200, 245, 59, 0.55)",
              }}
            >
              <Text
                style={{
                  ...textStyle("caption"),
                  color: c.tennis,
                }}
              >
                Full Arena ⤢
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Keep the mounted lane/scroll anchor, but suspend hidden field prop work. */
export const LaneTrack = memo(LaneTrackContent, (previous, next) => previous.active === false && next.active === false);
