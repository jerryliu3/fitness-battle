import { useThemeColors } from "../theme";
import { AthletePennant } from "./athlete-pennant";
import { chartTextProps, textStyle  } from "./section";
import {
  fieldCourse, fieldCourseScene, fieldScaleMarks, fieldLap, defaultFieldAppearance, fieldGrounds, type FieldAppearance, type FieldGround,
  fieldZoomSpan, pinchFieldView, fieldFlightDuration, fieldFlightEase, fieldProgressTrail,
  arenaPosition,
  arenaWindow,
  fieldDefaultSpan,
  ordinalPlace,
  athletePennantOffset,
  arenaFieldHigh,
  clampCourseCenter,
  initialsFromName,
  orderedArenaLanes,
  competeAthleteTrailColors,
  fieldLaneMarkerScale,
  polishedCapsulePath,
  type ArenaLane,
  type ArenaOvertakeFrame,
  type ArenaOvertakePlan,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
import { memo, useEffect, useId, useMemo, useRef, useState, type ComponentRef, type MutableRefObject } from "react";
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
import { FieldOverlayGroup } from "./field-overlay-motion";
import { PolishedRacer } from "./polished-racer";
export interface LaneAnchor { left: number; laneWidth: number; width: number; scroll: number; oval: boolean; count: number }

function LaneTrackContent({
  lanes,
  hiddenIds = [],
  appearance = defaultFieldAppearance,
  onChangeAppearance,
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
  overlaysHidden = false,
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
  overlaysHidden?: boolean;
  onExpand?: () => void;
  onToggleDimension?: () => void;
  onZoom?: (span: number) => void;
  anchor?: MutableRefObject<LaneAnchor | null>;
  appearance?: FieldAppearance;
  onChangeAppearance?: (appearance: FieldAppearance) => void;
  active?: boolean;
  /** Reserve room for an overlaid field status without covering lane headers. */
  topInset?: number;
  lanes: ArenaLane[];
  hiddenIds?: readonly string[];
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
  const c = useThemeColors();

  const prefix = useId();
  const [width, setWidth] = useState(340);
  const [visibleScroll, setVisibleScroll] = useState(anchor?.current?.scroll ?? 0);
  const surface = useRef<ComponentRef<typeof View>>(null);
  const scrollAfterZoom = useRef<number | null>(null);
  const lateralTravel = useRef<number | null>(null);
  const stopLateralTravel = () => { if (lateralTravel.current !== null) cancelAnimationFrame(lateralTravel.current); lateralTravel.current = null; };
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
  const latest = useRef({ v, onPan, onZoom, onViewChange, onGestureStart, fullscreen, clampCenter, course, width, height, unit, appearance, count: ordered.length });
  latest.current = { v, onPan, onZoom, onViewChange, onGestureStart, fullscreen, clampCenter, course, width, height, unit, appearance, count: ordered.length };
  const pending = useRef<{ view: ArenaViewWindow; scroll: number } | null>(null);
  const frame = useRef<number | null>(null);
  const start = useRef({ view: v, x: 0, y: 0, top: 0, left: 0, distance: 0, count: 1, scroll: 0 });
  const publish = () => {
    frame.current = null;
    const next = pending.current; pending.current = null;
    if (!next) return;
    const p = latest.current;
    if (next.view.span !== p.v.span) scrollAfterZoom.current = next.scroll;
    if (previous.current) previous.current.scroll = next.scroll;
    setVisibleScroll(next.scroll);
    if (p.onViewChange) p.onViewChange(next.view);
    else { if (next.view.span !== p.v.span) p.onZoom?.(next.view.span); p.onPan?.(next.view.center); }
  };
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: e => e.nativeEvent.touches.length >= 2,
    onStartShouldSetPanResponder: e => e.nativeEvent.touches.length >= 2,
    onMoveShouldSetPanResponderCapture: (e, g) => e.nativeEvent.touches.length >= 2 || Math.hypot(g.dx, g.dy) > 4 && (latest.current.fullscreen || Math.abs(g.dx) > Math.abs(g.dy) * 1.3),
    onMoveShouldSetPanResponder: (e, g) => e.nativeEvent.touches.length >= 2 || Math.hypot(g.dx, g.dy) > 4 && (latest.current.fullscreen || Math.abs(g.dx) > Math.abs(g.dy) * 1.3),
    onPanResponderGrant: e => {
      stopLateralTravel(); latest.current.onGestureStart?.();
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
      const next = p.fullscreen || count === 2 ? pinchFieldView(d.view, span, (d.y - d.top - p.course.top) / p.course.length, (y - d.top - p.course.top) / p.course.length) : { ...d.view };
      next.center = p.clampCenter(next.center, next.span);
      const fromCourse = fieldCourse(p.width, p.height, p.count, d.view, p.unit, p.appearance);
      const nextCourse = fieldCourse(p.width, p.height, p.count, next, p.unit, p.appearance);
      const scrollX = count === 2 ? nextCourse.left + (d.scroll + d.x - d.left - fromCourse.left) / fromCourse.laneWidth * nextCourse.laneWidth - (x - d.left) : d.scroll - (x - d.x);
      pending.current = { view: next, scroll: Math.max(0, Math.min(nextCourse.width - p.width, scrollX)) };
      if (frame.current === null) frame.current = requestAnimationFrame(publish);
    },
    onPanResponderRelease: () => { if (frame.current !== null) cancelAnimationFrame(frame.current); publish(); },
    onPanResponderTerminate: () => { if (frame.current !== null) cancelAnimationFrame(frame.current); publish(); },
    onPanResponderTerminationRequest: () => false,
  }), []);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); stopLateralTravel(); }, []);
  const ghost = showGhost ? lanes.find((l) => l.ghost) : null;
  const w = course.width, lw = course.laneWidth;
  const live = ordered.map(l => ({ ...l, value: animating ? overtakeFrame?.laneValues[l.id] ?? l.values[index] ?? 0 : l.values[index] ?? 0, initials: initialsFromName(l.name) }));
  const firstVisible = Math.max(0, Math.floor((visibleScroll - course.left) / lw) - 2);
  const lastVisible = Math.min(ordered.length - 1, Math.ceil((visibleScroll + width - course.left) / lw) + 2);
  const groundPaint = useMemo(() => fieldCourseScene(course, appearance, live, unit, prefix, { first: firstVisible, last: lastVisible }).map(drawFieldNode), [course, appearance, unit, prefix, firstVisible, lastVisible]);
  const bounds = arenaWindow(v.center, v.span);
  const localAnchor = useRef<LaneAnchor | null>(null);
  const previous = anchor ?? localAnchor;
  const prevSelectedRef = useRef(focusOnMount ? "" : `${selectedId}:${focusRequest}`);
  useEffect(() => {
    const old = previous.current;
    const laneIndex = followSelected ? Math.max(0, ordered.findIndex(l => l.id === selectedId)) : old && !old.oval && !course.oval && old.count === ordered.length ? (old.scroll + old.width / 2 - old.left) / old.laneWidth - .5 : Math.max(0, ordered.findIndex(l => l.you));
    const x = course.oval ? 0 : scrollAfterZoom.current ?? Math.max(0, Math.min(w - width, course.left + (laneIndex + .5) * lw - width / 2));
    scrollAfterZoom.current = null;
    setVisibleScroll(x);
    previous.current = { left: course.left, laneWidth: lw, width, scroll: x, oval: course.oval, count: ordered.length };
  }, [w, lw, width, course.left, course.oval, followSelected, followSelected ? selectedId : undefined]);
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
    stopLateralTravel();
    const from = previous.current?.scroll ?? visibleScroll;
    const apply = (value: number) => { setVisibleScroll(value); previous.current = { left: course.left, laneWidth: lw, width, scroll: value, oval: course.oval, count: ordered.length }; };
    if (!animateSelection) { apply(x); return; }
    const started = Date.now(), duration = fieldFlightDuration(v, v, (x - from) / lw);
    const tick = () => { const t = Math.min(1, (Date.now() - started) / duration); apply(from + (x - from) * fieldFlightEase(t)); lateralTravel.current = t < 1 ? requestAnimationFrame(tick) : null; };
    lateralTravel.current = requestAnimationFrame(tick);
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
      <View ref={surface} {...pan.panHandlers} style={{ height, overflow: "hidden" }}>
          <Svg
            pointerEvents="none"
            accessible
            width={width}
            height={height}
            viewBox={`${visibleScroll} 0 ${width} ${height}`}
            accessibilityLabel={`2D field, ${bounds.min.toFixed(2)} to ${bounds.max.toFixed(2)} ${unit}`}
          >
            <Rect x={visibleScroll} width={width} height={height} fill="transparent" />
            <G>{groundPaint}</G>
            {!course.oval && (
              <G pointerEvents="none">
                {fieldScaleMarks(bounds.min, bounds.max).map((d) => {
                  const y = course.along(d);
                  if (y < 8 || y > height - 8) return null;
                  return (
                    <G key={`mark-${d}`}>
                      <Path
                        d={`M ${visibleScroll} ${y} H ${visibleScroll + width}`}
                        stroke="rgba(255, 255, 255, 0.16)"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                      />
                      <G transform={`translate(${visibleScroll + 10} ${y - 8})`}>
                        <Rect
                          x={-3}
                          y={-8}
                          width={String(d).length * 7 + 26}
                          height={16}
                          rx={4}
                          fill="rgba(20, 20, 19, 0.65)"
                        />
                        <SvgText
                          {...chartTextProps()}
                          x={(String(d).length * 7 + 20) / 2}
                          y={4}
                          textAnchor="middle"
                          fill="#ffffff"
                        >
                          {`${d} ${unit}`}
                        </SvgText>
                      </G>
                    </G>
                  );
                })}
              </G>
            )}
            <G pointerEvents="none">
              {live.map((lane, i) => ({ lane, i })).sort((a, b) =>
                (a.lane.id === selectedId ? 2 : a.lane.you ? 1 : 0) - (b.lane.id === selectedId ? 2 : b.lane.you ? 1 : 0)
              ).map(({ lane, i }) => {
                if (hiddenIds.includes(lane.id) || !course.oval && (i < firstVisible || i > lastVisible)) return null;
                const trail = fieldProgressTrail(course, lane.value, i, unit);
                return trail ? <Path key={lane.id} d={trail} fill="none" stroke={competeAthleteTrailColors(Boolean(lane.you)).stroke} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" /> : null;
              })}
            </G>
            {ordered.map((l, i) => {
              if (hiddenIds.includes(l.id)) return null;
              if (!course.oval && (i < firstVisible || i > lastVisible)) return null;
              const value =
                animating && overtakeFrame
                  ? (overtakeFrame.laneValues[l.id] ?? l.values[index] ?? 0)
                  : (l.values[index] ?? 0);
              const position = arenaPosition(value, v);
              const edge = !course.oval && position.edge;
              const effect = overtakeFrame?.rivalEffects[l.id];
              const charging =
                l.you && animating ? (overtakeFrame?.charging ?? 0) : 0;
              const point = course.point(value, i, 0, true);
              const scale = edge ? 1 : Math.min(1.8, course.markerScale);
              const xx = point.x + (effect?.joltX ?? 0) * scale;
              const yy = point.y + (l.you ? charging * 4 * scale : 0);
              const headHalf = 29 * fieldLaneMarkerScale(Boolean(l.you));
              const rank=1+live.filter(peer=>peer.value>value+.000001).length;
              const pennantWidth=146, visibleLeft=previous.current?.scroll??0;
              const pennantX=Math.max(visibleLeft-xx+8,Math.min(visibleLeft+width-xx-pennantWidth-8,l.you?-pennantWidth-12:12));
              const pennantY=athletePennantOffset(yy,course.point(overtakeFrame?.youValue??me?.values[index]??0,Math.max(0,ordered.findIndex(peer=>peer.you)),0,true).y,l.you,height);
              return (
                <FieldOverlayGroup hidden={Boolean(edge && overlaysHidden)} key={l.id}>
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
                  {edge?<G transform={`translate(${xx} ${yy})`} pointerEvents="none"><Rect x={-34} y={edge==="ahead"?27:-42} width={68} height={20} rx={8} fill="#ffffffee"/><SvgText {...chartTextProps()} x={0} y={edge==="ahead"?41:-28} textAnchor="middle"  fill={c.muted}>{`${position.distanceOutside.toFixed(1)} ${unit}`}</SvgText></G>:null}
                  {!edge&&(l.you||selectedId===l.id)?<FieldOverlayGroup hidden={overlaysHidden} transform={`translate(${xx} ${yy})`} pointerEvents="none">
                    <AthletePennant lane={l} prefix={`${prefix}-portrait-${i}`} x={pennantX} y={pennantY} detail={`${ordinalPlace(rank)} · ${l.you ? `${value.toFixed(1)} ${unit}` : `${value-(overtakeFrame?.youValue??me?.values[index]??0)>0?"+":""}${(value-(overtakeFrame?.youValue??me?.values[index]??0)).toFixed(1)} ${unit}`}`} />
                  </FieldOverlayGroup>:null}
                </FieldOverlayGroup>
              );
            })}
            {ghost && (() => {
              const ghostValue = ghost.values[index] ?? 0;
              const pos = arenaPosition(ghostValue, v);
              if (!course.oval && pos.edge) return null;
              const youIdx = Math.max(0, ordered.findIndex((l) => l.you));
              const p = course.point(ghostValue, youIdx, 0, false);
              if (p.y < -30 || p.y > height + 30) return null;
              const scale = Math.min(1.8, course.markerScale);
              const markerScale = fieldLaneMarkerScale(true);
              return (
                <G
                  key="ghost-capsule"
                  transform={`translate(${p.x} ${p.y}) rotate(${p.angle}) scale(${scale})`}
                  pointerEvents="none"
                >
                  <G transform={`scale(${markerScale})`} opacity={0.6}>
                    <Path
                      d={polishedCapsulePath()}
                      fill="transparent"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                    <Path
                      d={polishedCapsulePath(2)}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.45)"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                    />
                  </G>
                  <G transform={`translate(0 ${-36 * markerScale})`}>
                    <Rect
                      x={-28}
                      y={-8}
                      width={56}
                      height={16}
                      rx={4}
                      fill="rgba(20, 20, 19, 0.75)"
                    />
                    <SvgText
                      {...chartTextProps()}
                      x={0}
                      y={3.5}
                      textAnchor="middle"
                      fill="#ffffff"
                    >
                      Last week
                    </SvgText>
                  </G>
                </G>
              );
            })()}
          </Svg>
        {!fullscreen && onExpand ? <Pressable accessibilityRole="button" accessibilityLabel="Open 2D map in full screen" onPress={onExpand} style={{ position: "absolute", inset: 0 }} /> : null}
        {ordered.flatMap((lane, i) => {
          if (hiddenIds.includes(lane.id)) return [];
          if (!course.oval && (i < firstVisible || i > lastVisible)) return null;
          const value = animating ? overtakeFrame?.laneValues[lane.id] ?? lane.values[index] : lane.values[index];
          const point = course.point(value, i, 0, true);
          const x = Math.max(visibleScroll - point.x + 8, Math.min(visibleScroll + width - point.x - 154, lane.you ? -158 : 12));
          const y = athletePennantOffset(point.y, course.point(me?.values[index] ?? 0, Math.max(0, ordered.findIndex(l => l.you)), 0, true).y, lane.you, height);
          const edge = !course.oval && arenaPosition(value, v).edge;
          if (edge && overlaysHidden) return [];
          return [
            <Pressable key={lane.id} accessibilityRole="button" accessibilityLabel={`Focus ${lane.name}`} accessibilityState={{ selected: selectedId === lane.id }} onPress={() => onSelect(lane)} style={{ position: "absolute", left: point.x - visibleScroll - 24, top: point.y - 30, width: 48, height: 60 }} />,
            !overlaysHidden && !edge && (lane.you || lane.id === selectedId) ? <Pressable key={`${lane.id}-nameplate`} accessible={false} onPress={() => onSelect(lane)} style={{ position: "absolute", left: point.x - visibleScroll + x, top: point.y + y, width: 146, height: 46 }} /> : null,
          ];
        })}
        {ghost && (() => {
          const ghostValue = ghost.values[index] ?? 0;
          const pos = arenaPosition(ghostValue, v);
          if (!course.oval && pos.edge) return null;
          const youIdx = Math.max(0, ordered.findIndex((l) => l.you));
          const p = course.point(ghostValue, youIdx, 0, false);
          if (p.y < -30 || p.y > height + 30) return null;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Focus past you"
              onPress={() => onSelect(ghost)}
              style={{
                position: "absolute",
                left: p.x - visibleScroll - 24,
                top: p.y - 30,
                width: 48,
                height: 60,
              }}
            />
          );
        })()}
      </View>
      {!fullscreen && onExpand ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 10,
            alignSelf: "center",
            backgroundColor: "rgba(20, 20, 19, 0.75)",
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ ...textStyle("caption"), color: "#ffffff" }}>
            Tap to open full screen
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Keep the mounted lane/scroll anchor, but suspend hidden field prop work. */
export const LaneTrack = memo(LaneTrackContent, (previous, next) => previous.active === false && next.active === false);
