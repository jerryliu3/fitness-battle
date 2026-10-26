import { chartTextProps, textStyle  } from "./section";
import { useEffect, useId, useMemo, useRef, useState, type ComponentRef, type MutableRefObject } from "react";
import {
  PanResponder,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
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
  portraitScaleAtDepth,
  portraitFieldGap,
  type ArenaSceneLane,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
import { LaneRacerTarget } from "./lane-racer-target";
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
  onExpand,
  onToggleDimension,
  laneAnchor,
}: {
  height?: number;
  fullscreen?: boolean;
  onExpand?: () => void;
  onToggleDimension?: () => void;
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
  const latest = useRef({ scene, view, onPan, width, height, exploring: exploring || fullscreen });
  latest.current = { scene, view, onPan, width, height, exploring: exploring || fullscreen };
  const surface = useRef<ComponentRef<typeof View>>(null);
  const frame = useRef<number | null>(null);
  const pending = useRef<{ offset: number; center: number } | null>(null);
  const start = useRef({ focus: 0, center: 0, span: 1, depth: 0, y: 0 });
  const [pan] = useState(() => PanResponder.create({
    // Claim movement before SVG portrait targets or the outer event pager.
    onMoveShouldSetPanResponderCapture: (_, g) => Math.hypot(g.dx, g.dy) > 8 && (latest.current.exploring || Math.abs(g.dx) > Math.abs(g.dy) * 1.3),
    onMoveShouldSetPanResponder: (_, g) => Math.hypot(g.dx, g.dy) > 8 && (latest.current.exploring || Math.abs(g.dx) > Math.abs(g.dy) * 1.3),
    onPanResponderGrant: (e, g) => {
      const p = latest.current;
      const pageY = e.nativeEvent.pageY, dy = g.dy;
      const y = e.nativeEvent.locationY - dy;
      start.current = { focus: p.scene.focus, center: p.view.center, span: p.view.span, depth: portraitDepthAt(y / p.height * 600), y };
      // SVG child touches can report child-local coordinates. Measure the
      // responder surface so the distance anchor uses the board's origin.
      surface.current?.measureInWindow((_x: number, top: number) => {
        const localY = pageY - top - dy;
        start.current = { ...start.current, y: localY, depth: portraitDepthAt(localY / p.height * 600) };
      });
    },
    onPanResponderMove: (_, g) => {
      const p = latest.current, d = start.current;
      pending.current = {
        offset: Math.max(0, Math.min(p.scene.ordered.length - 1, d.focus - g.dx / p.width * 420 / (222 * portraitScaleAtDepth(d.depth)))) - p.scene.baseFocus,
        center: d.center + (portraitDepthAt((d.y + g.dy) / p.height * 600) - d.depth) * d.span,
      };
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        const next = pending.current;
        pending.current = null;
        if (!next) return;
        setLaneOffset(next.offset);
        if (latest.current.exploring) latest.current.onPan(next.center);
      });
    },
    // Own a claimed field drag so the event carousel cannot steal it.
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; pending.current = null; },
  }));
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  const moveTo = (offset: number) => setLaneOffset(Math.max(0, Math.min(scene.ordered.length - 1, scene.baseFocus + offset)) - scene.baseFocus);
  const shift = (d: number) => moveTo(laneOffset + d);
  const prevSelectedRef = useRef<string | undefined>(focusOnMount ? undefined : selectedId);
  useEffect(() => {
    if (!selectedId || selectedId === prevSelectedRef.current) {
      prevSelectedRef.current = selectedId;
      return;
    }
    prevSelectedRef.current = selectedId;
    const focus = scene.ordered.findIndex((lane) => lane.id === selectedId);
    if (focus < 0) return;
    moveTo(focus - scene.baseFocus);
  }, [selectedId, scene.baseFocus, scene.ordered, animateSelection]);
  return (
    <View style={{ gap: 10 }}>
      <View style={s.status} pointerEvents="none">
        <Text style={[s.white, { color: "#142b3b" }]}>
          {scene.place} / {scene.fieldSize} PLACE
        </Text>
        <Text
          style={[s.white, { ...textStyle("caption"), color: "#142b3b", flexShrink: 1, textAlign: "right" }]}
        >
          {portraitFieldGap(scene.nextGap, unit)}
        </Text>
      </View>
    <View
      style={[s.board, { height, borderRadius: fullscreen ? 0 : 20 }]}
      onLayout={(e) => {
        if (e.nativeEvent.layout.width > 0)
          setWidth(e.nativeEvent.layout.width);
      }}
    >
      <Image source={alpineTrail} style={[s.scenery, { height: height * .44 }]} />
      <View ref={surface} style={StyleSheet.absoluteFill}>
          <Svg
            {...pan.panHandlers}
            width={width}
            height="100%"
            viewBox="0 0 420 600"
            preserveAspectRatio="none"
            accessibilityLabel="Distance perspective competition field"
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
            {scene.markers.map((m) => (
              <G key={`trail-${m.id}`} pointerEvents="none">
                <Path
                  d={m.trail}
                  stroke={m.color}
                  strokeWidth={12}
                  opacity={0.12}
                  fill="none"
                />
                <Path
                  d={m.trail}
                  stroke={m.color}
                  strokeWidth={5}
                  opacity={m.ghost ? 0.4 : 0.8}
                  strokeDasharray={m.ghost ? "5 6" : undefined}
                  fill="none"
                />
              </G>
            ))}
            {scene.markers
              .filter((m) => m.x > 22 && m.x < 398)
              .sort((a, b) => a.y - b.y)
              .map((m, i) => {
                const id = `${prefix}-portrait-${i}`;
                return (
                  <LaneRacerTarget
                    key={m.id}
                    onPress={() => onSelect(m.id)}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`${m.name}${m.you ? ", you" : ""}, ${m.gap.toFixed(1)} ${unit}${m.outside ? ", outside visible distance range" : ""}`}
                  >
                    <G transform={`translate(${m.x} ${m.y - 27 * m.scale}) scale(${m.scale})`}>
                    <Rect x={-30 / m.scale} y={-45 / m.scale} width={60 / m.scale} height={90 / m.scale} fill="transparent" />
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
                    </G>
                  </LaneRacerTarget>
                );
              })}
          </Svg>
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
      <View style={{ position: "absolute", top: 12, left: 12, right: 60, gap: 6 }}>
        {!fullscreen && <Pressable style={[s.controlRow, { alignSelf: "flex-start", minHeight: 44, paddingHorizontal: 16 }]} accessibilityRole="button" accessibilityLabel={exploring ? "Finish exploring field" : "Explore field in two directions"} accessibilityState={{ selected: exploring }} onPress={() => setExploring(!exploring)}><Text style={s.white}>{exploring ? "Done" : "Explore"}</Text></Pressable>}
        <Text style={[s.white, textStyle("caption")]}>{exploring || fullscreen ? "Drag in any direction" : "Swipe across lanes · Explore to move forward"}</Text>
      </View>
    </View>
      <View style={{ gap: 6 }}>
        {(["↑", "↓"] as const).map(direction => {
          const peers = scene.outside.filter(m => m.direction === direction && !m.ghost);
          if (!peers.length) return null;
          const nearest = peers.reduce((a,b) => Math.abs(a.value-view.center) < Math.abs(b.value-view.center) ? a : b);
          return <Pressable key={direction} style={[s.controlRow, { minHeight: 44, paddingHorizontal: 12 }]} accessibilityRole="button" onPress={() => { moveTo(scene.ordered.findIndex(l => l.id === nearest.id) - scene.baseFocus); onSelect(nearest.id); }}><Text style={[s.white, textStyle("caption")]}>{direction} {peers.length} {direction === "↑" ? "ahead" : "behind"} · {nearest.name.split(" ")[0]} {nearest.you ? "your position" : `${Math.abs(nearest.gap).toFixed(unit === "pts" ? 0 : 2)} ${unit} ${nearest.gap >= 0 ? "ahead of you" : "behind you"}`}</Text></Pressable>;
        })}
      </View>
      <View style={s.controls}>
        <View style={s.controlRow}>
          <Pressable style={s.button} accessibilityRole="button" accessibilityLabel="Previous lane" disabled={scene.focus <= 0} onPress={() => shift(-1)}><Text style={s.white}>←</Text></Pressable>
          <Pressable style={s.button} accessibilityRole="button" accessibilityLabel="Move backward" disabled={scene.min <= 0} onPress={() => onPan(view.center - view.span / 3)}><Text style={s.white}>↓</Text></Pressable>
          <Pressable style={s.button} accessibilityRole="button" accessibilityLabel="Your lane" onPress={() => { moveTo(0); onPan(lanes.find(l => l.you)?.value ?? 0); }}><Text style={s.white}>You</Text></Pressable>
          <Pressable style={s.button} accessibilityRole="button" accessibilityLabel="Move forward" onPress={() => onPan(view.center + view.span / 3)}><Text style={s.white}>↑</Text></Pressable>
          <Pressable style={s.button} accessibilityRole="button" accessibilityLabel="Next lane" disabled={scene.focus >= scene.ordered.length - 1} onPress={() => shift(1)}><Text style={s.white}>→</Text></Pressable>
        </View>
        <View style={s.controlRow}>
          <Pressable style={s.button} accessibilityRole="button" accessibilityLabel="Zoom out" disabled={view.span >= (unit === "pts" ? 100 : 40)} onPress={() => onZoom(Math.min(unit === "pts" ? 100 : 40, view.span * 1.5))}><Text style={s.white}>−</Text></Pressable>
          <Text style={[s.white, textStyle("caption")]}>{Math.max(0, scene.min).toFixed(unit === "pts" ? 0 : 2)}–{scene.max.toFixed(unit === "pts" ? 0 : 2)} {unit}</Text>
          <Pressable style={s.button} accessibilityRole="button" accessibilityLabel="Zoom in" disabled={view.span <= (unit === "pts" ? 2 : 0.5)} onPress={() => onZoom(Math.max(unit === "pts" ? 2 : 0.5, view.span / 1.5))}><Text style={s.white}>＋</Text></Pressable>
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
