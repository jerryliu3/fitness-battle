import { chartTextProps, textStyle  } from "./section";
import { useAnchoredMenu, AnchoredMenu } from "./anchored-menu";
import {
  fieldCourse, fieldCourseScene, fieldLap, defaultFieldAppearance, fieldGrounds, type FieldAppearance, type FieldGround,
  fieldZoomSpan, pinchFieldView, fieldFlightDuration, fieldFlightEase, fieldProgressTrail,
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
  fieldLaneMarkerScale,
  type ArenaLane,
  type ArenaOvertakeFrame,
  type ArenaOvertakePlan,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
import { memo, useEffect, useId, useMemo, useRef, useState, type ComponentRef, type MutableRefObject } from "react";
import { PanResponder, Pressable, ScrollView, Text, View } from "react-native";
import Svg, {
  Circle,
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
import { PolishedRacer } from "./polished-racer";
export interface LaneAnchor { left: number; laneWidth: number; width: number; scroll: number; oval: boolean; count: number }

function LaneTrackContent({
  lanes,
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
  const {
    open: styleMenuOpen,
    close: closeStyleMenu,
    toggle: toggleStyleMenu,
    anchorRef: styleTriggerRef,
    menuLayout,
  } = useAnchoredMenu({ minWidth: 220, estimatedHeight: 280 });

  useEffect(() => {
    if (!active) closeStyleMenu();
  }, [active, closeStyleMenu]);
  const [exploring, setExploring] = useState(false);
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
    if (previous.current) previous.current.scroll = next.scroll;
    setVisibleScroll(next.scroll);
    if (p.onViewChange) p.onViewChange(next.view);
    else { if (next.view.span !== p.v.span) p.onZoom?.(next.view.span); p.onPan?.(next.view.center); }
  };
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: e => e.nativeEvent.touches.length >= 2,
    onStartShouldSetPanResponder: e => e.nativeEvent.touches.length >= 2,
    onMoveShouldSetPanResponderCapture: (e, g) => e.nativeEvent.touches.length >= 2 || Math.hypot(g.dx, g.dy) > 4 && (latest.current.exploring || Math.abs(g.dx) > Math.abs(g.dy) * 1.3),
    onMoveShouldSetPanResponder: (e, g) => e.nativeEvent.touches.length >= 2 || Math.hypot(g.dx, g.dy) > 4 && (latest.current.exploring || Math.abs(g.dx) > Math.abs(g.dy) * 1.3),
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
      const next = p.exploring || count === 2 ? pinchFieldView(d.view, span, (d.y - d.top - p.course.top) / p.course.length, (y - d.top - p.course.top) / p.course.length) : { ...d.view };
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
            <G pointerEvents="none">
              {live.map((lane, i) => ({ lane, i })).sort((a, b) =>
                (a.lane.id === selectedId ? 2 : a.lane.you ? 1 : 0) - (b.lane.id === selectedId ? 2 : b.lane.you ? 1 : 0)
              ).map(({ lane, i }) => {
                if (!course.oval && (i < firstVisible || i > lastVisible)) return null;
                const trail = fieldProgressTrail(course, lane.value, i, unit);
                return trail ? <Path key={lane.id} d={trail} fill="none" stroke={competeAthleteTrailColors(Boolean(lane.you)).stroke} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" /> : null;
              })}
            </G>
            {ordered.map((l, i) => {
              if (!course.oval && (i < firstVisible || i > lastVisible)) return null;
              const value =
                animating && overtakeFrame
                  ? (overtakeFrame.laneValues[l.id] ?? l.values[index] ?? 0)
                  : (l.values[index] ?? 0);
              const edge = !course.oval && arenaPosition(value, v).edge;
              if (edge && overlaysHidden) return null;
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
                <G key={l.id}>
                <G>
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
                  {edge?<G transform={`translate(${xx} ${yy})`} pointerEvents="none"><Rect x={-34} y={edge==="ahead"?27:-42} width={68} height={20} rx={8} fill="#ffffffee"/><SvgText {...chartTextProps()} x={0} y={edge==="ahead"?41:-28} textAnchor="middle"  fill={c.muted}>{`${arenaPosition(value, v).distanceOutside.toFixed(1)} ${unit}`}</SvgText></G>:null}
                  {!overlaysHidden&&!edge&&(l.you||selectedId===l.id)?<G transform={`translate(${xx} ${yy})`} pointerEvents="none">
                    <Path d={`M0 0 L${pennantX+pennantWidth/2} ${pennantY>0?pennantY:pennantY+46}`} fill="none" stroke={c.secondary} strokeWidth={1.2}/>
                    <Rect x={pennantX} y={pennantY+2} width={pennantWidth} height={46} rx={12} fill={c.ink} opacity={.1}/>
                    <Rect x={pennantX} y={pennantY} width={pennantWidth} height={46} rx={12} fill={c.card} stroke={l.you?c.tennis:c.line}/>
                    <Circle cx={pennantX+24} cy={pennantY+23} r={16} fill={c.soft}/>
                    {l.avatarUrl?<><Defs><ClipPath id={`${prefix}-portrait-${i}`}><Circle cx={pennantX+24} cy={pennantY+23} r={16}/></ClipPath></Defs><SvgImage href={{uri:l.avatarUrl}} x={pennantX+8} y={pennantY+7} width={32} height={32} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${prefix}-portrait-${i})`}/></>:<Path d={PERSON_ICON_PATH} transform={`translate(${pennantX+14} ${pennantY+13}) scale(.83)`} fill="none" stroke={c.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>}
                    <SvgText {...chartTextProps()} x={pennantX+47} y={pennantY+20}  fill={c.ink} >{l.you?"You":l.name.length>13?`${l.name.slice(0,12)}…`:l.name}</SvgText>
                    <SvgText {...chartTextProps()} x={pennantX+47} y={pennantY+35}  fill={c.muted}>{ordinalPlace(rank)} · {l.you?`${value.toFixed(1)} ${unit}`:`${value-(overtakeFrame?.youValue??me?.values[index]??0)>0?"+":""}${(value-(overtakeFrame?.youValue??me?.values[index]??0)).toFixed(1)} ${unit}`}</SvgText>
                  </G>:null}
                </G>
                </G>
              );
            })}
            {ghost && (() => { const p = course.point(ghost.values[index] ?? 0, ordered.findIndex(l => l.you), 18 * Math.min(1.8, course.markerScale), true); return <G><Circle cx={p.x} cy={p.y} r={13 * Math.min(1.8, course.markerScale)} fill="#ffffffcc" stroke={c.muted} strokeDasharray="3 3"/></G>; })()}
          </Svg>
        <Pressable accessible={false} onPress={fullscreen ? () => {} : onExpand} style={{ position: "absolute", inset: 0 }} />
        {ordered.flatMap((lane, i) => {
          if (!course.oval && (i < firstVisible || i > lastVisible)) return null;
          const value = animating ? overtakeFrame?.laneValues[lane.id] ?? lane.values[index] : lane.values[index];
          const point = course.point(value, i, 0, true);
          const x = Math.max(visibleScroll - point.x + 8, Math.min(visibleScroll + width - point.x - 154, lane.you ? -158 : 12));
          const y = athletePennantOffset(point.y, course.point(me?.values[index] ?? 0, Math.max(0, ordered.findIndex(l => l.you)), 0, true).y, lane.you, height);
          const edge = !course.oval && arenaPosition(value, v).edge;
          return [
            <Pressable key={lane.id} accessibilityRole="button" accessibilityLabel={`Focus ${lane.name}`} accessibilityState={{ selected: selectedId === lane.id }} onPress={() => onSelect(lane)} style={{ position: "absolute", left: point.x - visibleScroll - 24, top: point.y - 30, width: 48, height: 60 }} />,
            !overlaysHidden && !edge && (lane.you || lane.id === selectedId) ? <Pressable key={`${lane.id}-nameplate`} accessible={false} onPress={() => onSelect(lane)} style={{ position: "absolute", left: point.x - visibleScroll + x, top: point.y + y, width: 146, height: 46 }} /> : null,
          ];
        })}
        {ghost && (() => {
          const p = course.point(ghost.values[index] ?? 0, ordered.findIndex(l => l.you), 18 * Math.min(1.8, course.markerScale), true);
          return <Pressable accessibilityRole="button" accessibilityLabel="Focus past you" onPress={() => onSelect(ghost)} style={{ position: "absolute", left: p.x - visibleScroll - 22, top: p.y - 22, width: 44, height: 44 }} />;
        })()}
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
          {onChangeAppearance ? (
            <View ref={styleTriggerRef} collapsable={false}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Map style: ${fieldGrounds[appearance.ground]?.name ?? "Style"}`}
                accessibilityState={{ expanded: styleMenuOpen }}
                onPress={toggleStyleMenu}
                style={{ minHeight: 36, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, backgroundColor: "rgba(20, 20, 19, 0.78)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.2)" }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: fieldGrounds[appearance.ground]?.lane ?? c.tennis }} />
                <Text style={{ ...textStyle("caption"), color: "#ffffff" }}>{fieldGrounds[appearance.ground]?.name ?? "Style"} ▾</Text>
              </Pressable>
            </View>
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
      <AnchoredMenu
        open={styleMenuOpen}
        onClose={closeStyleMenu}
        menuLayout={menuLayout}
        accessibilityLabel="Close style menu"
        style={{ padding: 8 }}
      >
        <Text
          style={[
            textStyle("caption"),
            { paddingHorizontal: 8, paddingVertical: 4, color: c.muted },
          ]}
        >
          Field style
        </Text>
        <ScrollView style={{ maxHeight: 260 }}>
          {Object.entries(fieldGrounds).map(([id, item]) => {
            const isSelected = appearance.ground === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  void playCue("selection");
                  onChangeAppearance?.({
                    ...appearance,
                    ground: id as FieldGround,
                  });
                   closeStyleMenu();
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  minHeight: 38,
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: isSelected ? c.soft : "transparent",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 14,
                    height: 18,
                    borderRadius: 4,
                    backgroundColor: item.lane,
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.12)",
                  }}
                />
                <Text
                  style={[
                    isSelected ? textStyle("label") : textStyle("body"),
                    {
                      flex: 1,
                      color: isSelected ? c.ink : c.muted,
                    },
                  ]}
                >
                  {item.name}
                </Text>
                {isSelected ? (
                  <Text style={[textStyle("label"), { color: c.tennis }]}>✓</Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </AnchoredMenu>
    </View>
  );
}

/** Keep the mounted lane/scroll anchor, but suspend hidden field prop work. */
export const LaneTrack = memo(LaneTrackContent, (previous, next) => previous.active === false && next.active === false);
