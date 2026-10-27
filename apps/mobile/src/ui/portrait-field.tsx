import { FieldOverlayGroup, FieldOverlayView } from "./field-overlay-motion";
import { chartTextProps, textStyle  } from "./section";
import { useEffect, useId, useMemo, useRef, useState, type ComponentRef, type MutableRefObject } from "react";
import {
  PanResponder,
  Platform,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Image as SvgImage,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import {
  portraitField,
  portraitDepthAt,
  portraitPanDepthAt,
  portraitScaleAtDepth,
  portraitFieldGap,
  competeAthleteTrailColors,
  fieldFlightDuration, fieldFlightEase, fieldZoomSpan, pinchFieldView,
  type ArenaSceneLane,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
import { IconButton } from "./icon-button";
import { drawFieldNode } from "./field-course";
import { alpineTrail } from "./club-art";
export function PortraitField({
  lanes,
  view,
  unit,
  selectedId,
  focusOnMount = false,
  animateSelection = true,
  onZoom,
  onPan,
  onSelect,
  height = 560,
  fullscreen = false,
  overlaysHidden = false,
  onExpand,
  onToggleDimension,
  controlsTop = 12,
  laneAnchor,
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
  controlsTop?: number;
  laneAnchor?: MutableRefObject<number>;
  lanes: ArenaSceneLane[];
  view: ArenaViewWindow;
  unit: string;
  selectedId?: string;
  focusOnMount?: boolean;
  animateSelection?: boolean;
  onZoom: (span: number) => void;
  onPan: (center: number) => void;
  onSelect: (id: string) => void;
}) {
  const [laneOffset, setLaneOffset] = useState(laneAnchor?.current ?? 0);
  const prefix = useId().replace(/:/g, "");
  if (laneAnchor) laneAnchor.current = laneOffset;
  const scene = useMemo(() => portraitField(lanes, view, undefined, laneOffset, prefix), [lanes, view.center, view.span, laneOffset, prefix]);
  const [width, setWidth] = useState(340);
  const [exploring, setExploring] = useState(false);
  const latest = useRef({ scene, view, onPan, onZoom, onViewChange, onGestureStart, width, height, exploring: exploring || fullscreen, unit });
  latest.current = { scene, view, onPan, onZoom, onViewChange, onGestureStart, width, height, exploring: exploring || fullscreen, unit };
  const surface = useRef<ComponentRef<typeof View>>(null);
  const frame = useRef<number | null>(null);
  const travel = useRef<number | null>(null);
  const pending = useRef<{ offset: number; view: ArenaViewWindow } | null>(null);
  const stopTravel = () => { if (travel.current !== null) cancelAnimationFrame(travel.current); travel.current = null; };
  const interruptTravel = () => { stopTravel(); onGestureStart?.(); };
  const panTo = (center: number) => { interruptTravel(); onPan(center); };
  const zoomTo = (span: number) => { interruptTravel(); onZoom(span); };
  const publish = () => {
    frame.current = null;
    const next = pending.current;
    pending.current = null;
    if (!next) return;
    setLaneOffset(next.offset);
    const p = latest.current;
    if (p.onViewChange) p.onViewChange(next.view);
    else { if (next.view.span !== p.view.span) p.onZoom(next.view.span); if (p.exploring || next.view.span !== p.view.span) p.onPan(next.view.center); }
  };
  const start = useRef({ focus: 0, view, depth: 0, x: 0, y: 0, top: 0, distance: 0, count: 1 });
  const [pan] = useState(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: e => e.nativeEvent.touches.length >= 2,
    onStartShouldSetPanResponder: e => e.nativeEvent.touches.length >= 2,
    onMoveShouldSetPanResponderCapture: (e, g) => (e?.nativeEvent.touches?.length ?? 0) >= 2 || Math.hypot(g.dx, g.dy) > 4 && (latest.current.exploring || Math.abs(g.dx) > Math.abs(g.dy) * 1.3),
    onMoveShouldSetPanResponder: (e, g) => (e?.nativeEvent.touches?.length ?? 0) >= 2 || Math.hypot(g.dx, g.dy) > 4 && (latest.current.exploring || Math.abs(g.dx) > Math.abs(g.dy) * 1.3),
    onPanResponderGrant: (e, g) => {
      stopTravel(); latest.current.onGestureStart?.();
      const p = latest.current, touches = e.nativeEvent.touches;
      const a = touches?.[0], b = touches?.[1];
      const x = a ? (a.pageX + (b?.pageX ?? a.pageX)) / 2 : e.nativeEvent.pageX ?? 0;
      const y = a ? (a.pageY + (b?.pageY ?? a.pageY)) / 2 : e.nativeEvent.pageY;
      const top = e.nativeEvent.pageY - e.nativeEvent.locationY;
      start.current = { focus: p.scene.focus, view: p.view, depth: portraitDepthAt((y - top) / p.height * 600), x, y, top, distance: a && b ? Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) : 0, count: b ? 2 : 1 };
      surface.current?.measureInWindow((_x: number, measuredTop: number) => {
        start.current.top = measuredTop;
        start.current.depth = portraitDepthAt((start.current.y - measuredTop) / p.height * 600);
      });
    },
    onPanResponderMove: (e, g) => {
      const p = latest.current, d = start.current, touches = e?.nativeEvent.touches;
      const a = touches?.[0], b = touches?.[1];
      const count = b ? 2 : 1;
      const x = a ? (a.pageX + (b?.pageX ?? a.pageX)) / 2 : d.x + g.dx;
      const y = a ? (a.pageY + (b?.pageY ?? a.pageY)) / 2 : d.y + g.dy;
      const distance = a && b ? Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) : 0;
      if (count !== d.count) {
        const next = pending.current;
        start.current = { ...d, count, x, y, distance, view: next?.view ?? p.view, focus: next ? p.scene.baseFocus + next.offset : p.scene.focus, depth: portraitDepthAt((y - d.top) / p.height * 600) };
        return;
      }
      const depth = portraitDepthAt((y - d.top) / p.height * 600);
      const span = count === 2 && distance > 0 && d.distance > 0 ? fieldZoomSpan(d.view.span * d.distance / distance, p.unit) : d.view.span;
      const nextView = p.exploring || count === 2 ? pinchFieldView(d.view, span, d.depth, depth) : p.view;
      if (p.exploring && count === 1) nextView.center = d.view.center + (portraitPanDepthAt((y - d.top) / p.height * 600) - portraitPanDepthAt((d.y - d.top) / p.height * 600)) * d.view.span;
      pending.current = {
        offset: Math.max(0, Math.min(p.scene.ordered.length - 1, d.focus - (x - d.x) / p.width * 420 / (222 * portraitScaleAtDepth(d.depth)))) - p.scene.baseFocus,
        view: nextView,
      };
      if (frame.current === null) frame.current = requestAnimationFrame(publish);
    },
    onPanResponderRelease: () => { if (frame.current !== null) cancelAnimationFrame(frame.current); publish(); },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => { if (frame.current !== null) cancelAnimationFrame(frame.current); publish(); },
  }));
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); stopTravel(); }, []);
  const moveTo = (offset: number, animate = animateSelection) => {
    stopTravel();
    const target = Math.max(0, Math.min(scene.ordered.length - 1, scene.baseFocus + offset)) - scene.baseFocus;
    if (!animate) { setLaneOffset(target); return; }
    const from = laneOffset, started = Date.now(), duration = fieldFlightDuration(view, view, target - from);
    const tick = () => { const t = Math.min(1, (Date.now() - started) / duration); setLaneOffset(from + (target - from) * fieldFlightEase(t)); travel.current = t < 1 ? requestAnimationFrame(tick) : null; };
    travel.current = requestAnimationFrame(tick);
  };
  const shift = (d: number) => { interruptTravel(); moveTo(laneOffset + d, false); };
  const prevSelectedRef = useRef(focusOnMount ? "" : `${selectedId}:${focusRequest}`);
  useEffect(() => {
    const key = `${selectedId}:${focusRequest}`;
    if (!selectedId || key === prevSelectedRef.current) return;
    prevSelectedRef.current = key;
    const focus = scene.ordered.findIndex((lane) => lane.id === selectedId);
    if (focus >= 0) moveTo(focus - scene.baseFocus);
  }, [selectedId, focusRequest, scene.baseFocus, scene.ordered, animateSelection]);
  return (
    <View style={{ gap: 10 }}>
      <FieldOverlayView hidden={overlaysHidden} style={s.status} pointerEvents="none">
        <Text style={[s.white, { color: "#142b3b" }]}>
          {scene.place} / {scene.fieldSize} PLACE
        </Text>
        <Text
          style={[s.white, { ...textStyle("caption"), color: "#142b3b", flexShrink: 1, textAlign: "right" }]}
        >
          {portraitFieldGap(scene.nextGap, unit)}
        </Text>
      </FieldOverlayView>
    <View
      style={[s.board, { height, borderRadius: fullscreen ? 0 : 20 }]}
      onLayout={(e) => {
        if (e.nativeEvent.layout.width > 0)
          setWidth(e.nativeEvent.layout.width);
      }}
    >
      <Image source={alpineTrail} style={[s.scenery, { height: height * .44 }]} />
      <View ref={surface} {...pan.panHandlers} style={{ ...StyleSheet.absoluteFill, ...(Platform.OS === "web" ? { touchAction: exploring || fullscreen ? "none" : "pan-y" } : {}) }}>
          <Svg
            pointerEvents="none"
            accessible
            width={width}
            height="100%"
            viewBox="0 0 420 600"
            preserveAspectRatio="none"
            accessibilityLabel={`3D field, ${scene.min.toFixed(2)} to ${scene.max.toFixed(2)} ${unit}`}
          >
            <Defs>
              <LinearGradient
                id={`${prefix}-shade`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <Stop offset="0%" stopColor="#0b3038" stopOpacity={0} />
                <Stop offset="100%" stopColor="#0b3038" />
              </LinearGradient>
            </Defs>
            <G>
            <Rect width={420} height={600} fill="transparent" />
            <Rect
              y={80}
              width={420}
              height={520}
              fill={`url(#${prefix}-shade)`}
            />
            {scene.ground.map(drawFieldNode)}
            {scene.ticks.map(t => <G key={t.value}><Rect x={4} y={t.y - 10} width={78} height={20} rx={6} fill="#103e46"/><SvgText {...chartTextProps()} x={12} y={t.y + 4} fill="#f8f9f6">{t.value === 0 ? "START" : `${t.value.toLocaleString("en-US", { maximumFractionDigits: 3 })} ${unit}`}</SvgText></G>)}
            <Defs>
              <LinearGradient
                id={`${prefix}-horizon`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <Stop offset="0%" stopColor="#b4d3cd" stopOpacity={0} />
                <Stop offset="55%" stopColor="#b4d3cd" stopOpacity={0.2} />
                <Stop offset="100%" stopColor="#b4d3cd" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect
              y={126}
              width={420}
              height={110}
              fill={`url(#${prefix}-horizon)`}
            />
            </G>
            {[...scene.trails].sort((a, b) =>
              (a.id === selectedId ? 2 : a.you ? 1 : 0) - (b.id === selectedId ? 2 : b.you ? 1 : 0)
            ).map(m => {
              const trail = competeAthleteTrailColors(Boolean(m.you), Boolean(m.ghost));
              return <Path key={`trail-${m.id}`} pointerEvents="none" d={m.trail}
                stroke={trail.stroke} strokeWidth={trail.strokeWidth} opacity={trail.strokeOpacity}
                vectorEffect="non-scaling-stroke" strokeLinecap="round" fill="none" />;
            })}
            {scene.markers
              .filter((m) => m.x > 22 && m.x < 398)
              .sort((a, b) => a.y - b.y)
              .map((m, i) => {
                const id = `${prefix}-portrait-${i}`;
                return (
                  <G key={m.id}>
                    <G transform={`translate(${m.x} ${m.y - 27 * m.scale}) scale(${m.scale})`}>
                    <Rect x={-30 / m.scale} y={-45 / m.scale} width={60 / m.scale} height={90 / m.scale} fill="transparent" />
                    {!m.ghost && m.trail ? (
                      <Circle
                        cx={0}
                        cy={27}
                        r={7}
                        fill="#ffffff"
                        stroke={m.you ? "#f7c948" : "#98a6bc"}
                        strokeWidth={3}
                      />
                    ) : (
                      <>
                        <Ellipse
                          cy={27}
                          rx={24}
                          ry={10}
                          fill={m.color}
                          opacity={0.16}
                        />
                        <Ellipse
                          cy={27}
                          rx={16}
                          ry={6}
                          fill="#143c43"
                          stroke={m.color}
                          strokeWidth={2.5}
                        />
                        <Ellipse cy={27} rx={5} ry={2} fill={m.color} />
                      </>
                    )}
                    <Path
                      d="M-9 12 L0 27 L9 12"
                      fill={m.you ? "#f7c948" : "#f8f9f6"}
                    />
                    <Rect
                      x={-23}
                      y={-43}
                      width={46}
                      height={58}
                      rx={12}
                      fill="#f8f9f6"
                      stroke={m.you ? "#f7c948" : "#b3c9c5"}
                      strokeWidth={m.you ? 3 : 1.5}
                    />
                    <Defs>
                      <ClipPath id={id}>
                        <Rect x={-19} y={-39} width={38} height={50} rx={9} />
                      </ClipPath>
                    </Defs>
                    {m.avatarUrl ? (
                      <SvgImage
                        href={{ uri: m.avatarUrl }}
                        x={-19}
                        y={-39}
                        width={38}
                        height={50}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#${id})`}
                      />
                    ) : (
                      <>
                        <Rect
                          x={-19}
                          y={-39}
                          width={38}
                          height={50}
                          rx={9}
                          fill={m.you ? "#f7c948" : "#d8e5df"}
                        />
                        <SvgText {...chartTextProps()}
                          y={-8}
                          textAnchor="middle"
                          fill="#142b3b"

                        >
                          {m.initials}
                        </SvgText>
                      </>
                    )}
                    <FieldOverlayGroup hidden={overlaysHidden}>
                    {m.you ? (
                      <>
                        <Rect
                          x={-22}
                          y={-66}
                          width={44}
                          height={18}
                          rx={9}
                          fill="#f7c948"
                        />
                        <SvgText {...chartTextProps()}
                          y={-53}
                          textAnchor="middle"
                          fill="#142b3b"

                        >
                          YOU
                        </SvgText>
                      </>
                    ) : null}
                    <SvgText {...chartTextProps()}
                      y={45}
                      textAnchor="middle"
                      fill="white"

                    >
                      {m.ghost
                        ? "Past you"
                        : m.you
                          ? "You"
                          : m.name.split(" ")[0]}
                    </SvgText>
                    {!m.you ? (
                      <SvgText {...chartTextProps()}
                        y={61}
                        textAnchor="middle"
                        fill="#e5eee5"

                      >
                        {m.outside ? `${m.direction} ` : ""}
                        {m.gap > 0 ? "+" : ""}
                        {m.gap.toFixed(unit === "pts" ? 0 : 2)} {unit}
                      </SvgText>
                    ) : null}
                    </FieldOverlayGroup>
                    </G>
                  </G>
                );
              })}
          </Svg>
          <Pressable accessible={false} onPress={() => {}} style={{ position: "absolute", inset: 0 }} />
          {scene.markers.filter(m => m.x > 22 && m.x < 398).map(m => <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`Focus ${m.name}`} accessibilityState={{ selected: selectedId === m.id }} onPress={() => onSelect(m.id)} style={{ position: "absolute", left: (m.x - 30) / 420 * width, top: (m.y - 27 * m.scale - 45) / 600 * height, width: 60 / 420 * width, height: 90 / 600 * height }} />)}
      </View>
      {!fullscreen && (onToggleDimension || onExpand) ? (
        <View
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            zIndex: 30,
          }}
        >
          {onToggleDimension ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch to 2D map"
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
                3D
              </Text>
            </Pressable>
          ) : null}
          {onExpand ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Full Arena"
              onPress={onExpand}
              style={{
                minHeight: 36,
                paddingHorizontal: 14,
                justifyContent: "center",
                borderRadius: 999,
                backgroundColor: "rgba(20, 20, 19, 0.78)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.2)",
              }}
            >
              <Text style={{ ...textStyle("caption"), color: "#ffffff" }}>
                Full Arena ↗
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <FieldOverlayView hidden={overlaysHidden} pointerEvents="box-none" style={{ position: "absolute", top: controlsTop, left: 12, right: 60, gap: 6 }}>
        {!fullscreen && <Pressable style={[s.controlRow, { alignSelf: "flex-start", minHeight: 44, paddingHorizontal: 16 }]} accessibilityRole="button" accessibilityLabel={exploring ? "Finish exploring field" : "Explore field in two directions"} accessibilityState={{ selected: exploring }} onPress={() => setExploring(!exploring)}><Text style={s.white}>{exploring ? "Done" : "Explore"}</Text></Pressable>}
        <View pointerEvents="none"><Text style={[s.white, textStyle("caption")]}>{exploring || fullscreen ? "Drag to move · Pinch to zoom" : "Swipe across lanes · Explore to move forward"}</Text></View>
      </FieldOverlayView>
    </View>
      <View style={{ gap: 6 }}>
        {(["↑", "↓"] as const).map(direction => {
          const peers = scene.outside.filter(m => m.direction === direction && !m.ghost);
          if (!peers.length) return null;
          const nearest = peers.reduce((a,b) => Math.abs(a.value-view.center) < Math.abs(b.value-view.center) ? a : b);
          return <Pressable key={direction} style={[s.controlRow, { minHeight: 44, paddingHorizontal: 12 }]} accessibilityRole="button" onPress={() => { onSelect(nearest.id); }}><Text style={[s.white, textStyle("caption")]}>{direction} {peers.length} {direction === "↑" ? "ahead" : "behind"} · {nearest.name.split(" ")[0]} {`${nearest.edgeGap.toFixed(1)} ${unit} from view`}</Text></Pressable>;
        })}
      </View>
      <View style={s.controls}>
        <View style={s.controlRow}>
          <Pressable style={s.button} accessibilityRole="button" accessibilityLabel="Previous lane" disabled={scene.focus <= 0} onPress={() => shift(-1)}><Text style={s.white}>←</Text></Pressable>
          <Pressable style={s.button} accessibilityRole="button" accessibilityLabel="Move backward" disabled={scene.min <= 0} onPress={() => panTo(view.center - view.span / 3)}><Text style={s.white}>↓</Text></Pressable>
          <Pressable style={s.button} accessibilityRole="button" accessibilityLabel="Your lane" onPress={() => { onSelect(lanes.find(l => l.you)?.id ?? ""); }}><Text style={s.white}>You</Text></Pressable>
          <Pressable style={s.button} accessibilityRole="button" accessibilityLabel="Move forward" onPress={() => panTo(view.center + view.span / 3)}><Text style={s.white}>↑</Text></Pressable>
          <Pressable style={s.button} accessibilityRole="button" accessibilityLabel="Next lane" disabled={scene.focus >= scene.ordered.length - 1} onPress={() => shift(1)}><Text style={s.white}>→</Text></Pressable>
        </View>
        <View style={s.controlRow}>
          <Pressable style={s.button} accessibilityRole="button" accessibilityLabel="Zoom out" disabled={view.span >= (unit === "pts" ? 100 : 40)} onPress={() => zoomTo(Math.min(unit === "pts" ? 100 : 40, view.span * 1.5))}><Text style={s.white}>−</Text></Pressable>
          <Text style={[s.white, textStyle("caption")]}>{Math.max(0, scene.min).toFixed(unit === "pts" ? 0 : 2)}–{scene.max.toFixed(unit === "pts" ? 0 : 2)} {unit}</Text>
          <Pressable style={s.button} accessibilityRole="button" accessibilityLabel="Zoom in" disabled={view.span <= (unit === "pts" ? 2 : 0.5)} onPress={() => zoomTo(Math.max(unit === "pts" ? 2 : 0.5, view.span / 1.5))}><Text style={s.white}>＋</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  board: {
    height: 560,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#0b3038",
  },
  scenery: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 230,
  },
  status: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  white: { ...textStyle("label"), color: "#fff" },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#102e38ed",
    borderWidth: 1,
    borderColor: "#68858a",
    borderRadius: 28,
    paddingHorizontal: 6,
  },
  button: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
