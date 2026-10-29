"use client";
import { AthletePennant } from "../field/components/athlete-pennant";
import { useFieldGestures } from "../field/use-field-gestures";
import { UserAvatarSvg } from "@/ui/user-avatar-svg";
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
  competeAthleteTrailColors,
  fieldLaneMarkerScale,
  fieldCourse, fieldCourseScene, fieldLap, defaultFieldAppearance, type FieldAppearance,
  selfLaneLabel,
  type ArenaOvertakeFrame,
  type ArenaOvertakePlan,
  type ArenaSceneLane,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
import { drawFieldNode } from "@/features/field/components/field-course";
import { PolishedRacer } from "@/features/brand/polished-racer";
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
  followSelected = false,
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
  /** Keep a passive replay camera centered on its selected athlete. */
  followSelected?: boolean;
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
  const [measured, setMeasured] = useState(false);
  const [size, setSize] = useState({ width: 360, height: 540 });
  const previousGeometry = useRef<{ width: number; laneWidth: number; count: number; left: number; oval: boolean } | null>(null);
  const laneScroll = useRef<number | null>(null);
  const scrollAfterZoom = useRef<number | null>(null);
  const [visibleScroll, setVisibleScroll] = useState(0);
  const animating = Boolean(overtakeFrame && overtakeFrame.phase !== "done");
  const liveLanes =
    animating && overtakeFrame
      ? lanes.map((l) => ({
          ...l,
          value: overtakeFrame.laneValues[l.id] ?? l.value,
        }))
      : lanes;
  const ordered = orderedArenaLanes(liveLanes);
  const ghost = liveLanes.find((l) => l.ghost);
  const effectiveCenter = appearance.ground === "oval" ? Math.max(0, view.center) : clampArenaLaneCenter(view.center, view.span);
  const clampPanCenter = (value: number, span: number) => appearance.ground === "oval" ? Math.max(0, value) : clampArenaLaneCenter(value, span);
  const effectiveView: ArenaViewWindow =
    effectiveCenter === view.center
      ? view
      : { center: effectiveCenter, span: view.span };
  const bounds = arenaWindow(effectiveView.center, effectiveView.span);
  const previousCamera = useRef({ center: effectiveView.center, span: effectiveView.span, ground: appearance.ground });
  const cameraChanged = previousCamera.current.center !== effectiveView.center || previousCamera.current.span !== effectiveView.span || previousCamera.current.ground !== appearance.ground;
  useLayoutEffect(() => { previousCamera.current = { center: effectiveView.center, span: effectiveView.span, ground: appearance.ground }; });
  const course = useMemo(() => fieldCourse(size.width, size.height, ordered.length, effectiveView, unit, appearance), [size.width, size.height, ordered.length, effectiveView.center, effectiveView.span, unit, appearance]);
  const firstVisible = Math.max(0, Math.floor((visibleScroll - course.left) / course.laneWidth) - 2);
  const lastVisible = Math.min(ordered.length - 1, Math.ceil((visibleScroll + size.width - course.left) / course.laneWidth) + 2);
  const groundPaint = useMemo(() => fieldCourseScene(course, appearance, ordered, unit, prefix, standings ? undefined : { first: firstVisible, last: lastVisible }).map(drawFieldNode), [course, appearance, unit, prefix, firstVisible, lastVisible, standings]);
  const width = standings ? size.width : course.width;
  const height = standings ? Math.max(160, ordered.length * 76 + 24) : course.height;
  const laneWidth = course.laneWidth, plotHeight = course.length;

  const yourValue = liveLanes.find((lane) => lane.you)?.value ?? 0;
  const relativeDistance = (value: number) => `${value - yourValue > 0 ? "+" : ""}${(value - yourValue).toFixed(1)} ${unit}`;

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
    const laneIndex = followSelected ? Math.max(0, ordered.findIndex(lane => lane.id === selected)) : previous && !previous.oval && !course.oval && previous.count === ordered.length
      ? ((laneScroll.current ?? el.scrollLeft) + previous.width / 2 - previous.left) / previous.laneWidth - 0.5
      : Math.max(0, ordered.findIndex((lane) => lane.you));
    el.scrollLeft = course.oval ? 0 : scrollAfterZoom.current ?? Math.max(0, Math.min(width - size.width, course.left + (laneIndex + .5) * laneWidth - size.width / 2));
    scrollAfterZoom.current = null;
    setVisibleScroll(el.scrollLeft);
    laneScroll.current = el.scrollLeft;
    previousGeometry.current = { width: size.width, laneWidth, count: ordered.length, left: course.left, oval: course.oval };
  }, [width, laneWidth, size.width, standings, course.oval, course.left, followSelected, selected]);
  const prevSelectedRef = useRef(focusOnMount ? "" : `${selected}:${focusRequest}`);
  useLayoutEffect(() => {
    const key = `${selected}:${focusRequest}`;
    if (prevSelectedRef.current === key) return;
    prevSelectedRef.current = key;
    const el = host.current;
    if (!el || el.clientWidth === 0 || standings || course.oval || !selected) return;
    const idx = ordered.findIndex((lane) => lane.id === selected);
    if (idx < 0) return;
    const nextScroll = Math.max(0, Math.min(width - size.width, course.left + (idx + .5) * laneWidth - size.width / 2));
    el.scrollTo({ left: nextScroll, behavior: reduced ? "instant" : "smooth" });
  }, [selected, focusRequest, standings, course.oval, course.left, laneWidth, width, size.width, ordered]);
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
      if (id) onSelect(id); else if (!standings) onBackgroundTap?.();
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
        aria-label={standings ? `Athlete standings, ranked by weekly ${unit === "pts" ? "effort" : "distance"}` : `Vertical athlete lanes, ${bounds.min.toFixed(1)} to ${bounds.max.toFixed(1)} ${unit}. Drag to explore.`}
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
          return trail ? <path key={lane.id} d={trail} fill="none" stroke={competeAthleteTrailColors(Boolean(lane.you)).stroke} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" /> : null;
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
          const active = selected === l.id || l.you;
          const headHalf =
            29 *
            (standings
              ? polishedLaneScale(Boolean(l.you))
              : fieldLaneMarkerScale(Boolean(l.you)));
          const pennantWidth=146;
          const visibleLeft=host.current?.scrollLeft??0;
          const pennantX=Math.max(visibleLeft-targetX+8,Math.min(visibleLeft+size.width-targetX-pennantWidth-8,l.you?-pennantWidth-12:12));
          const pennantY=athletePennantOffset(targetY,course.point(yourValue,Math.max(0,ordered.findIndex(peer=>peer.you)),0,true).y,Boolean(l.you),height);
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
              aria-label={`${course.oval && !standings ? `${fieldLap(l.value, unit).laps} completed laps, ` : ""}${l.name}, ${standings ? `place ${rank}, ${scores[l.id] != null ? `${effortRankBadge(scores[l.id]).name} level, ` : ""}` : ""}${formatLastUpdated(l)}, ${!standings && edge ? `${position.distanceOutside.toFixed(1)} ${unit} ${position.edge} of visible range` : `${relativeDistance(l.value)} relative to you`}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(l.id);
                }
              }}
            >
              <g transform={`rotate(${standings ? 0 : point.angle}) scale(${markerScale})`}>
              {l.you && charging > 0.02 && (
                <g
                  opacity={charging}
                  stroke="#f1c75b"
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
                  stroke="#f1c75b"
                  strokeWidth={3 - effect.ripple * 2}
                  opacity={1 - effect.ripple}
                  pointerEvents="none"
                  data-overtake-ripple="true"
                />
              )}
              {/* Local echoes own their animation; replay only moves the parent marker. */}
              {l.mystery ? <g data-mystery-marker="true"><circle cx={xx} cy={yy} r={18} fill="white" stroke="#616c63" strokeWidth={2} strokeDasharray="3 3"/><text x={xx} y={yy+5} textAnchor="middle" fill="#282f2c" style={typographyStyle("label")}>?</text></g> : standings || !edge ? (
                <PolishedRacer
                  sizeScale={standings ? undefined : fieldLaneMarkerScale(Boolean(l.you))}
                  x={xx}
                  y={yy}
                  you={Boolean(l.you)}
                  gold={rank === 1}
                  active={active}
                  showWake={false}
                  />
              ) : <circle r={18} fill="white" stroke="#616c63" strokeDasharray="3 3"/>}
              <rect className="focus-racer-focus-ring" x={-23} y={-headHalf-3} width={46} height={headHalf*2+6} rx={23} fill="none" stroke="#f1c75b" strokeWidth={2}/>
              <rect x={xx - 24 / markerScale} y={yy - Math.max(22 / markerScale, headHalf + 4)} width={48 / markerScale} height={Math.max(44 / markerScale, headHalf * 2 + 8)} rx="24" fill="transparent"/>
              {standings && l.avatarUrl && <UserAvatarSvg src={l.avatarUrl} name={l.name} x={xx-17} y={yy-17} />}
              {((standings && !l.avatarUrl) || (!standings && edge)) && <text style={typographyStyle("caption")} x={xx} y={yy+4} textAnchor="middle" className="lane-initial" fill="#282f2c">{!standings&&edge?(edge==="ahead"?"↑":"↓"):l.initials}</text>}
              </g>
              {!standings&&edge&&<g pointerEvents="none"><rect x={-34} y={edge==="ahead"?27:-42} width={68} height={20} rx={8} fill="#ffffffee"/><text style={typographyStyle("caption")} x={0} y={edge==="ahead"?41:-28} textAnchor="middle"  fill="#616c63">{position.distanceOutside.toFixed(1)} {unit}</text></g>}
              {!standings && !edge && (l.you || selected===l.id) && <g className="athlete-pennant" pointerEvents="none">
                <AthletePennant lane={l} prefix={`${prefix}-portrait-${i}`} x={pennantX} y={pennantY} detail={`${liveLanes.some(peer => peer.mystery) ? "Starts at zero" : ordinalPlace(rank)} · ${l.you ? `${l.value.toFixed(1)} ${unit}` : relativeDistance(l.value)}`} />
              </g>}
              <g aria-hidden={!standings} display={standings ? "inline" : "none"}>
              <motion.g initial={false} animate={{ opacity: standings ? 1 : 0 }}>
                <rect x={-30} y={-33} width={Math.max(200, width - 16)} height={70} rx={14} fill="transparent" />
                <line x1={-22} x2={width - 52} y1={38} y2={38} stroke="#e0e5dc" />
                <text style={typographyStyle("caption")} x={40} y={4} fill="#616c63" >{rank}</text>
                <text style={typographyStyle("row")} x={64} y={-5} fill="#282f2c"  >{l.you ? selfLaneLabel(l.name) : l.name}{scores[l.id] != null ? ` ${effortRankBadge(scores[l.id]).symbol}` : ""}</text>
                <text style={typographyStyle("caption")} x={64} y={15} fill="#a67c00" >{scores[l.id] ?? "—"} effort score</text>
                <text style={typographyStyle("value")} x={width - 58} y={5} textAnchor="end" fill="#282f2c"  >{l.value.toFixed(1)} {unit}</text>
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
                aria-label={`Past you, ${ghost.value.toFixed(1)} ${unit}, not ranked`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelect(ghost.id);
                }}
              >
                <circle
                  cx={gx}
                  cy={gy}
                  r={13 * course.markerScale}
                  fill="#ffffffcc"
                  stroke="#616c63"
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
