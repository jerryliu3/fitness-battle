"use client";
import { colors as appearanceColors } from "@/theme/app-colors";

import { AthleteNode } from "../field/components/athlete-node";
import { useFieldGestures } from "../field/use-field-gestures";
import { typographyStyle } from "@/ui/section";

import { useRef, useEffect, useLayoutEffect, useState, useId, useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  pinchFieldView, fieldProgressTrail,
  arenaPosition,
  ordinalPlace, effortRankBadge,
  athletePennantOffset,
  formatActivityAge,
  arenaWindow,
  clampArenaLaneCenter,
  orderedArenaLanes,
  polishedLaneScale,
  fieldLaneMarkerScale,
  arenaValueDecimals, fieldCourse, fieldCourseScene, fieldLap, defaultFieldAppearance, arenaStandingsQuantityLabel, type FieldAppearance,
  type ArenaOvertakeFrame,
  type ArenaOvertakePlan,
  type ArenaSceneLane,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
import { drawFieldNode } from "@/features/field/components/field-course";
export function ArenaLanes({
  lanes,
  appearance = defaultFieldAppearance,
  presentation = "lanes",
  scores = {},
  immersive = false,
  view,
  unit,
  selected,
  focusOnMount = false,
  focusSelection = true,
  clampView = true,
  followSelected = false,
  replayFocusIds,
  playback = false,
  onSelect,
  onPan,
  onBackgroundTap,
  onZoom, onViewChange, onGestureStart, focusRequest = 0,
  overtakeFrame = null,
  overtakePlan = null,
}: {
  focusRequest?: number;
  onZoom?: (span: number) => void;
  onViewChange?: (view: ArenaViewWindow) => void;
  onGestureStart?: () => void;
  lanes: ArenaSceneLane[];
  appearance?: FieldAppearance;
  presentation?: "lanes" | "standings";
  scores?: Record<string, number>;
  immersive?: boolean;
  view: ArenaViewWindow;
  unit: string;
  selected: string;
  focusOnMount?: boolean;
  focusSelection?: boolean;
  clampView?: boolean;
  /** Keep a passive replay camera centered on its selected athlete. */
  followSelected?: boolean;
  replayFocusIds?: readonly string[];
  /** Replay already interpolates positions on its own animation clock. */
  playback?: boolean;
  onSelect: (id: string) => void;
  onPan: (center: number) => void;
  onBackgroundTap?: () => void;
  overtakeFrame?: ArenaOvertakeFrame | null;
  overtakePlan?: ArenaOvertakePlan | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const surface = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const standings = presentation === "standings";
  const prefix = useId();
  const valueDecimals = arenaValueDecimals(unit);
  const [measured, setMeasured] = useState(false);
  const [size, setSize] = useState({ width: 360, height: 540 });
  const previousGeometry = useRef<{ width: number; laneWidth: number; count: number; left: number; oval: boolean } | null>(null);
  const laneScroll = useRef<number | null>(null);
  const scrollAfterZoom = useRef<number | null>(null);
  const [visibleScroll, setVisibleScroll] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  useEffect(() => { setExpandedId(null); }, [focusRequest]);
  const animating = Boolean(overtakeFrame && overtakeFrame.phase !== "done");
  const liveLanes =
    animating && overtakeFrame
      ? lanes.map((l) => ({
          ...l,
          value: overtakeFrame.laneValues[l.id] ?? l.value,
        }))
      : lanes;
  const ordered = orderedArenaLanes(liveLanes);
  const focusId = selected || ordered.find(peer => peer.you)?.id;
  const ghost = liveLanes.find((l) => l.ghost);
  const effectiveCenter = !clampView ? view.center : appearance.ground === "oval" ? Math.max(0, view.center) : clampArenaLaneCenter(view.center);
  const clampPanCenter = (value: number, span: number) => appearance.ground === "oval" ? Math.max(0, value) : clampArenaLaneCenter(value);
  const effectiveView: ArenaViewWindow =
    effectiveCenter === view.center
      ? view
      : { center: effectiveCenter, span: view.span };
  const bounds = arenaWindow(effectiveView.center, effectiveView.span);
  const previousCamera = useRef({ center: effectiveView.center, span: effectiveView.span, ground: appearance.ground });
  const cameraChanged = previousCamera.current.center !== effectiveView.center || previousCamera.current.span !== effectiveView.span || previousCamera.current.ground !== appearance.ground;
  useLayoutEffect(() => { previousCamera.current = { center: effectiveView.center, span: effectiveView.span, ground: appearance.ground }; });
  const replayFocusKey = replayFocusIds?.join(":");
  const replayFocus = replayFocusIds?.map(id=>ordered.findIndex(l=>l.id===id));
  const course = useMemo(() => fieldCourse(size.width, size.height, ordered.length, effectiveView, unit, appearance, replayFocus), [size.width, size.height, ordered.length, effectiveView.center, effectiveView.span, unit, appearance, replayFocusKey]);
  const firstVisible = Math.max(0, Math.floor((visibleScroll - course.left) / course.laneWidth) - 2);
  const lastVisible = Math.min(ordered.length - 1, Math.ceil((visibleScroll + size.width - course.left) / course.laneWidth) + 2);
  const groundPaint = useMemo(() => fieldCourseScene(course, appearance, ordered, unit, prefix, standings ? undefined : { first: firstVisible, last: lastVisible }).map(drawFieldNode), [course, appearance, unit, prefix, firstVisible, lastVisible, standings]);
  const width = standings ? size.width : course.width;
  const height = standings ? Math.max(160, ordered.length * 76 + 24) : course.height;
  const laneWidth = course.laneWidth, plotHeight = course.length;

  const yourValue = liveLanes.find((lane) => lane.you)?.value ?? 0;
  const relativeDistance = (value: number) => `${value - yourValue > 0 ? "+" : ""}${(value - yourValue).toFixed(valueDecimals)} ${unit}`;

  const sortedByValue = [...ordered].sort((a, b) => b.value - a.value);
  const Marker = playback ? "g" : motion.g;

  function formatLastUpdated(lane: ArenaSceneLane): string {
    return lane.you && lane.value === 0
      ? "joined"
      : formatActivityAge(lane.lastUpdated);
  }

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) { setSize({ width: el.clientWidth, height: el.clientHeight }); setMeasured(true); }
    };
    // Measure before the first painted frame. Waiting for the first observer
    // notification lets the SVG render once at its fallback 360px width, then
    // visibly stretch and recenter as soon as the real container size arrives.
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const el = host.current;
    if (!el || el.clientWidth === 0 || standings) return;
    const previous = previousGeometry.current;
    const laneIndex = followSelected ? Math.max(0, ordered.findIndex(lane => lane.id === focusId)) : previous && !previous.oval && !course.oval && previous.count === ordered.length
      ? ((laneScroll.current ?? el.scrollLeft) + previous.width / 2 - previous.left) / previous.laneWidth - 0.5
      : Math.max(0, ordered.findIndex((lane) => lane.you));
    el.scrollLeft = course.oval ? 0 : course.focusScroll ?? scrollAfterZoom.current ?? Math.max(0, Math.min(width - size.width, course.left + (laneIndex + .5) * laneWidth - size.width / 2));
    scrollAfterZoom.current = null;
    setVisibleScroll(el.scrollLeft);
    laneScroll.current = el.scrollLeft;
    previousGeometry.current = { width: size.width, laneWidth, count: ordered.length, left: course.left, oval: course.oval };
  }, [width, laneWidth, size.width, standings, course.oval, course.left, course.focusScroll, followSelected, focusId]);
  const prevSelectedRef = useRef(focusOnMount ? "" : `${focusId}:${focusRequest}`);
  useLayoutEffect(() => {
    const key = `${focusId}:${focusRequest}`;
    if (!focusSelection) { host.current?.scrollTo({ left: host.current.scrollLeft, behavior: "instant" }); return; }
    if (replayFocusIds || prevSelectedRef.current === key) return;
    prevSelectedRef.current = key;
    const el = host.current;
    if (!el || el.clientWidth === 0 || standings || course.oval || !focusId) return;
    const idx = ordered.findIndex((lane) => lane.id === focusId);
    if (idx < 0) return;
    const nextScroll = Math.max(0, Math.min(width - size.width, course.left + (idx + .5) * laneWidth - size.width / 2));
    el.scrollTo({ left: nextScroll, behavior: reduced ? "instant" : "smooth" });
  }, [focusId, focusRequest, focusSelection, standings, course.oval, course.left, laneWidth, width, size.width, ordered]);
  const gestures = useFieldGestures({
    surface, view: effectiveView, unit, enabled: immersive,
    lateral: () => host.current?.scrollLeft ?? 0,
    onStart: () => { host.current?.scrollTo({ left: host.current.scrollLeft, behavior: "instant" }); onGestureStart?.(); },
    onMove: gesture => {
      if (standings) return;
      const el = host.current;
      if (!el) return;
      el.scrollLeft = gesture.lateral - (gesture.to.x - gesture.from.x);
      if (immersive || gesture.pinching) {
        const { top, left } = el.getBoundingClientRect();
        const next = pinchFieldView(gesture.view, gesture.span, (gesture.from.y - top - course.top) / plotHeight, (gesture.to.y - top - course.top) / plotHeight);
        next.center = clampPanCenter(next.center, next.span);
        const fromCourse = fieldCourse(size.width, size.height, ordered.length, gesture.view, unit, appearance);
        const nextCourse = fieldCourse(size.width, size.height, ordered.length, next, unit, appearance);
        const nextScroll = gesture.pinching ? Math.max(0, Math.min(nextCourse.width - size.width, nextCourse.left + (gesture.lateral + gesture.from.x - left - fromCourse.left) / fromCourse.laneWidth * nextCourse.laneWidth - (gesture.to.x - left))) : el.scrollLeft;
        if (gesture.pinching) scrollAfterZoom.current = nextScroll;
        if (onViewChange) onViewChange(next); else { if (gesture.pinching) onZoom?.(next.span); onPan(next.center); }
        return { view: next, lateral: nextScroll };
      }
      return { view: gesture.view, lateral: el.scrollLeft };
    },
    onTap: (event, target) => {
      const id = (target as Element).closest("[data-athlete]")?.getAttribute("data-athlete");
      if (id) {
        setExpandedId(prev => prev === id ? null : id);
        onSelect(id);
      } else {
        setExpandedId(null);
        if (!standings) onBackgroundTap?.();
      }
    },
  });
  return (
    <div className="focus-lane-surface" style={{ position: "relative", minWidth: 0 }}>
    <div className="focus-lane-scroll" ref={host} data-immersive={immersive}
      onScroll={(event) => { if (!standings) { laneScroll.current = event.currentTarget.scrollLeft; setVisibleScroll(event.currentTarget.scrollLeft); } }}
      style={{ visibility: measured ? "visible" : "hidden", height: standings ? height : undefined, transition: reduced ? "none" : "height .48s cubic-bezier(.22,1,.36,1)" }}>
      <svg
        ref={surface}
        className="focus-lane-track"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ width, height, touchAction: immersive ? "none" : "pan-y" }}
        role="group"
        aria-label={standings ? `Athlete standings, ranked by weekly ${arenaStandingsQuantityLabel(unit)}` : `Vertical athlete lanes, ${bounds.min.toFixed(valueDecimals)} to ${bounds.max.toFixed(valueDecimals)} ${unit}. Drag to explore.`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (!standings && e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault(); onBackgroundTap?.();
          }
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            onPan(
              clampPanCenter(
                effectiveView.center +
                  ((e.key === "ArrowUp" ? 1 : -1) * effectiveView.span) / 4,
                effectiveView.span,
              ),
            );
          }
        }}
        {...gestures}
      >
        <motion.g aria-hidden={standings} initial={false} animate={{ opacity: standings ? 0 : 1 }} style={{ pointerEvents: "none" }}>
          {groundPaint}
        </motion.g>
        {!standings && <g pointerEvents="none">{ordered.map((lane, i) => ({ lane, i })).sort((a, b) =>
          (a.lane.id === selected ? 2 : a.lane.you ? 1 : 0) - (b.lane.id === selected ? 2 : b.lane.you ? 1 : 0)
        ).map(({ lane, i }) => {
          if (!course.oval && (i < firstVisible || i > lastVisible)) return null;
          const trail = fieldProgressTrail(course, lane.value, i, unit);
          const trailWidth = 40 * Math.min(1.8, course.markerScale) * fieldLaneMarkerScale(Boolean(lane.you));
          const leader = !ordered.some(peer => peer.value > lane.value);
          return trail ? <path key={lane.id} d={trail} fill="none" stroke={leader ? appearanceColors.tennis : appearanceColors.secondary} strokeWidth={trailWidth} strokeLinecap="round" strokeLinejoin="round" /> : null;
        })}</g>}
        {ordered.map((l, i) => {
          if (!standings && !course.oval && (i < firstVisible || i > lastVisible)) return null;
          const position = arenaPosition(l.value, effectiveView);
          const effect = overtakeFrame?.rivalEffects[l.id];
          const charging =
            l.you && animating ? (overtakeFrame?.charging ?? 0) : 0;
          const row = sortedByValue.findIndex((lane) => lane.id === l.id);
          const rank = 1 + sortedByValue.filter((lane) => lane.value > l.value).length;
          const point = course.point(l.value, i, 0, true);
          const targetY = standings ? 48 + row * 76 : point.y + (l.you ? charging * 4 * course.markerScale : 0);
          const targetX = standings ? 38 : point.x + (effect?.joltX ?? 0) * course.markerScale;
          const edge = !course.oval && position.edge;
          const markerScale = standings || edge ? 1 : Math.min(1.8, course.markerScale);
          const xx = 0, yy = 0;
          const isSelected = selected === l.id;
          const isExpanded = !standings && !edge && expandedId === l.id;
          const headHalf =
            24 *
            (standings
              ? polishedLaneScale(Boolean(l.you))
              : fieldLaneMarkerScale(Boolean(l.you)));
          const pennantWidth=128;
          const visibleLeft=host.current?.scrollLeft??0;
          const pennantX=Math.max(visibleLeft-targetX+8,Math.min(visibleLeft+size.width-targetX-pennantWidth-8,l.you?-pennantWidth-16:16));
          const pennantY=athletePennantOffset(targetY,course.point(yourValue,Math.max(0,ordered.findIndex(peer=>peer.you)),0,true).y,Boolean(l.you),height);
          const subdetail = liveLanes.some(peer => peer.mystery)
            ? undefined
            : l.you
              ? rank === 1
                ? "Leading the field"
                : `${(l.value - (sortedByValue[0]?.value ?? 0)).toFixed(valueDecimals)} ${unit} vs #1`
              : relativeDistance(l.value);
          return (
            <Marker
              key={l.id}
              {...(playback ? { transform: `translate(${targetX} ${targetY})` } : {
                initial: false,
                animate: { x: targetX, y: targetY },
                transition: { duration: reduced || cameraChanged || animating || previousGeometry.current?.width !== size.width ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] as const },
              })}
              data-athlete={l.id}
              data-offscreen={edge || undefined}
              role="button"
              aria-pressed={selected === l.id}
              tabIndex={0}
              aria-label={`${course.oval && !standings ? `${fieldLap(l.value, unit).laps} completed laps, ` : ""}${l.name}, ${standings ? `place ${rank}, ${scores[l.id] != null ? `${effortRankBadge(scores[l.id]).name} level, ` : ""}` : ""}${formatLastUpdated(l)}, ${!standings && edge ? `${position.distanceOutside.toFixed(valueDecimals)} ${unit} ${position.edge} of visible range` : `${relativeDistance(l.value)} relative to you`}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  setExpandedId(prev => prev === l.id ? null : l.id);
                  onSelect(l.id);
                }
              }}
            >
              <g transform={`rotate(${standings ? 0 : point.angle}) scale(${markerScale})`}>
              {l.you && charging > 0.02 && (
                <g
                  opacity={charging}
                  stroke={appearanceColors.actionPrimary}
                  strokeWidth="2"
                  strokeLinecap="round"
                  pointerEvents="none"
                >
                  <path
                    d={`M ${xx - 30} ${yy - 4} l -8 6 l 5 2 l -5 7 M ${xx + 30} ${yy - 6} l 8 6 l -5 2 l 5 7`}
                    fill="none"
                  />
                </g>
              )}
              {effect?.isPassed && effect.ripple < 1 && (
                <circle
                  cx={xx}
                  cy={yy}
                  r={19 + effect.ripple * 24}
                  fill="none"
                  stroke={appearanceColors.actionPrimary}
                  strokeWidth={3 - effect.ripple * 2}
                  opacity={1 - effect.ripple}
                  pointerEvents="none"
                  data-overtake-ripple="true"
                />
              )}
              <rect className="focus-racer-focus-ring" x={-26} y={-26} width={52} height={52} rx={26} fill="none" stroke={appearanceColors.actionPrimary} strokeWidth={2}/>
              <rect x={xx - 26 / markerScale} y={yy - Math.max(26 / markerScale, headHalf + 4)} width={52 / markerScale} height={Math.max(52 / markerScale, headHalf * 2 + 8)} rx="26" fill="transparent"/>
              </g>
              {l.mystery ? (
                <g data-mystery-marker="true" transform={`scale(${markerScale})`}>
                  <circle cx={xx} cy={yy} r={20} fill="white" stroke={appearanceColors.textSecondary} strokeWidth={2} strokeDasharray="3 3"/>
                  <text x={xx} y={yy+5} textAnchor="middle" fill={appearanceColors.textSecondary} style={typographyStyle("label")}>?</text>
                </g>
              ) : !standings && edge ? (
                <g pointerEvents="none">
                  <AthleteNode
                    lane={{ ...l, ghost: true }}
                    prefix={`${prefix}-edge-${i}`}
                    x={0}
                    y={0}
                    detail=""
                    expanded={false}
                    selected={isSelected}
                    nodeRadius={18}
                  />
                </g>
              ) : (
                <g className="athlete-pennant">
                  <AthleteNode
                    lane={l}
                    prefix={`${prefix}-portrait-${i}`}
                    x={pennantX}
                    y={pennantY}
                    nodeScale={markerScale * (standings ? polishedLaneScale(Boolean(l.you)) : fieldLaneMarkerScale(Boolean(l.you)))}
                    selected={isSelected}
                    expanded={isExpanded}
                    gold={rank === 1}
                    detail={`${liveLanes.some(peer => peer.mystery) ? "Starts at zero" : ordinalPlace(rank)} · ${l.value.toFixed(valueDecimals)} ${unit}`}
                    subdetail={subdetail}
                  />
                </g>
              )}
              <g aria-hidden={!standings} display={standings ? "inline" : "none"}>
              <motion.g initial={false} animate={{ opacity: standings ? 1 : 0 }}>
                <rect x={-30} y={-33} width={Math.max(200, width - 16)} height={70} rx={14} fill="transparent" />
                <line x1={-22} x2={width - 52} y1={38} y2={38} stroke={appearanceColors.borderSubtle} />
                <text style={typographyStyle("caption")} x={40} y={4} fill={appearanceColors.textSecondary} >{rank}</text>
                <text style={typographyStyle("row")} x={64} y={-5} fill={appearanceColors.textSecondary}  >{l.name}{scores[l.id] != null ? ` ${effortRankBadge(scores[l.id]).symbol}` : ""}</text>
                <text style={typographyStyle("caption")} x={64} y={15} fill="#a67c00" >{scores[l.id] ?? "—"} effort score</text>
                <text style={typographyStyle("value")} x={width - 58} y={5} textAnchor="end" fill={appearanceColors.textSecondary}  >{l.value.toFixed(valueDecimals)} {unit}</text>
              </motion.g>
              </g>
            </Marker>
          );
        })}
        {ghost && !standings &&
          (() => {
            const i = ordered.findIndex((l) => l.you);
            const gp = course.point(ghost.value, i, 18 * course.markerScale, true);
            const gx = gp.x, gy = gp.y;
            return (
              <g
                role="button"
                tabIndex={0}
                data-athlete={ghost.id}
                aria-label={`Past you, ${ghost.value.toFixed(valueDecimals)} ${unit}, not ranked`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelect(ghost.id);
                }}
              >
                <circle
                  cx={gx}
                  cy={gy}
                  r={13 * course.markerScale}
                  fill="#ffffffcc"
                  stroke={appearanceColors.textSecondary}
                  strokeDasharray="3 3"
                />
                <text style={typographyStyle("caption")}
                  x={gx}
                  y={gy + 4}
                  textAnchor="middle"
                  className="lane-distance"
                >
                  ◌
                </text>
              </g>
            );
          })()}
      </svg>
    </div>
    </div>
  );
}
