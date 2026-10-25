"use client";
import { UserAvatarSvg } from "@/ui/user-avatar-svg";
import { typographyStyle } from "@/ui/section";

import { useRef, useLayoutEffect, useState, useId, useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  arenaPosition,
  ordinalPlace, effortRankBadge,
  athletePennantOffset,
  PERSON_ICON_PATH,
  formatActivityAge,
  arenaWindow,
  clampArenaLaneCenter,
  orderedArenaLanes,
  polishedLaneScale,
  fieldCourse, fieldCourseScene, fieldScaleScene, fieldLap, defaultFieldAppearance, type FieldAppearance,
  selfLaneLabel,
  type ArenaOvertakeFrame,
  type ArenaOvertakePlan,
  type ArenaSceneLane,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
import { drawFieldNode } from "@/features/field/components/field-course";
import { PolishedRacer, usePolishedWakeTime } from "@/features/brand/polished-racer";
export function ArenaLanes({
  lanes,
  appearance = defaultFieldAppearance,
  presentation = "lanes",
  scores = {},
  immersive = false,
  view,
  unit,
  selected,
  onSelect,
  onPan,
  onBackgroundTap,
  overtakeFrame = null,
  overtakePlan = null,
}: {
  lanes: ArenaSceneLane[];
  appearance?: FieldAppearance;
  presentation?: "lanes" | "standings";
  scores?: Record<string, number>;
  immersive?: boolean;
  view: ArenaViewWindow;
  unit: string;
  selected: string;
  onSelect: (id: string) => void;
  onPan: (center: number) => void;
  onBackgroundTap?: () => void;
  overtakeFrame?: ArenaOvertakeFrame | null;
  overtakePlan?: ArenaOvertakePlan | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const standings = presentation === "standings";
  const prefix = useId();
  const wakeTime = usePolishedWakeTime(host, immersive && !standings);
  const [measured, setMeasured] = useState(false);
  const [size, setSize] = useState({ width: 360, height: 540 });
  const previousGeometry = useRef<{ width: number; laneWidth: number; count: number; left: number; oval: boolean } | null>(null);
  const laneScroll = useRef<number | null>(null);
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    scrollLeft: number;
    center: number;
    moved: boolean;
    mode: "undecided" | "vertical" | "horizontal";
    captured: boolean;
    id: string | null;
  } | null>(null);
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
  const groundPaint = useMemo(() => fieldCourseScene(course, appearance, ordered, unit, prefix).map(drawFieldNode), [course, appearance, lanes, overtakeFrame, unit, prefix]);
  const width = standings ? size.width : course.width;
  const height = standings ? Math.max(160, ordered.length * 76 + 24) : course.height;
  const laneWidth = course.laneWidth, plotHeight = course.length;
  const maxTailY = Math.min(height - 58, bounds.min <= 0 && bounds.max >= 0 ? course.along(0) + 4 : height - 58);

  const yourValue = liveLanes.find((lane) => lane.you)?.value ?? 0;
  const relativeDistance = (value: number) => `${value - yourValue > 0 ? "+" : ""}${(value - yourValue).toFixed(1)} ${unit}`;

  const sortedByValue = [...ordered].sort((a, b) => b.value - a.value);

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
    const laneIndex = previous && !previous.oval && !course.oval && previous.count === ordered.length
      ? ((laneScroll.current ?? el.scrollLeft) + previous.width / 2 - previous.left) / previous.laneWidth - 0.5
      : Math.max(0, ordered.findIndex((lane) => lane.you));
    el.scrollLeft = course.oval ? 0 : Math.max(0, Math.min(width - size.width, course.left + (laneIndex + .5) * laneWidth - size.width / 2));
    laneScroll.current = el.scrollLeft;
    previousGeometry.current = { width: size.width, laneWidth, count: ordered.length, left: course.left, oval: course.oval };
  }, [width, laneWidth, size.width, standings, course.oval, course.left]);
  return (
    <div className="focus-lane-surface" style={{ position: "relative", minWidth: 0 }}>
    <div className="focus-lane-scroll" ref={host} data-immersive={immersive}
      onScroll={(event) => { if (!standings) laneScroll.current = event.currentTarget.scrollLeft; }}
      style={{ visibility: measured ? "visible" : "hidden", height: standings ? height : undefined, transition: reduced ? "none" : "height .48s cubic-bezier(.22,1,.36,1)" }}>
      <svg
        className="focus-lane-track"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ width, height, touchAction: immersive ? "none" : "pan-y pinch-zoom" }}
        role="group"
        aria-label={standings ? "Athlete standings, ranked by weekly effort" : `Vertical athlete lanes, ${bounds.min.toFixed(1)} to ${bounds.max.toFixed(1)} ${unit}. Drag to explore.`}
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
        onPointerDown={(e) => {
          if (!e.isPrimary || e.button !== 0) return;
          drag.current = {
            pointerId: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            scrollLeft: host.current?.scrollLeft ?? 0,
            center: effectiveView.center,
            moved: false,
            mode: "undecided",
            captured: false,
            id:
              (e.target as Element)
                .closest("[data-athlete]")
                ?.getAttribute("data-athlete") ?? null,
          };
        }}
        onPointerMove={(e) => {
          if (standings) return;
          const press = drag.current;
          if (!press || press.pointerId !== e.pointerId) return;
          const scale = e.currentTarget.getBoundingClientRect().height / height || 1;
          const dx = (e.clientX - press.x) / scale;
          const dy = (e.clientY - press.y) / scale;
          if (press.mode === "undecided") {
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
            if (Math.abs(dx) > Math.abs(dy)) {
              press.mode = "horizontal";
              press.captured = true;
              e.currentTarget.setPointerCapture(e.pointerId);
            } else {
              if (!immersive && e.pointerType === "touch") { drag.current = null; return; }
              press.mode = "vertical";
              if (!press.captured) {
                press.captured = true;
                e.currentTarget.setPointerCapture(e.pointerId);
              }
            }
          }
          if (press.mode === "horizontal") {
            press.moved = true;
            const el = host.current;
            if (el) el.scrollLeft = press.scrollLeft - dx;
            return;
          }
          if (press.mode === "vertical") {
            if (!press.captured) {
              press.captured = true;
              e.currentTarget.setPointerCapture(e.pointerId);
            }
            if (Math.abs(dy) > 5) {
              press.moved = true;
              onPan(
                clampPanCenter(
                  press.center + (dy / plotHeight) * effectiveView.span,
                  effectiveView.span,
                ),
              );
            }
          }
        }}
        onPointerUp={(e) => {
          const press = drag.current;
          drag.current = null;
          if (!press || press.pointerId !== e.pointerId) return;
          if (press.captured) {
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
              /* already released */
            }
          }
          if (!press.moved && press.id) {
            onSelect(press.id);
            return;
          }
          if (!press.moved && !press.id && !standings) onBackgroundTap?.();
        }}
        onLostPointerCapture={() => { drag.current = null; }}
        onPointerCancel={(e) => {
          const press = drag.current;
          drag.current = null;
          if (press?.captured) {
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
              /* already released */
            }
          }
        }}
      >
        <motion.g aria-hidden={standings} initial={false} animate={{ opacity: standings ? 0 : 1 }} style={{ pointerEvents: "none" }}>
          {groundPaint}
          {!course.oval && course.laneWidth >= 48 && ordered.map((lane, i) => <text style={typographyStyle("caption")} key={lane.id} x={course.point(effectiveView.center, i).x} y={36} textAnchor="middle" className={lane.you ? "lane-title is-you" : "lane-title"}>{`${ordinalPlace(1 + ordered.filter(peer=>peer.value>lane.value+0.000001).length)}${lane.you?" · You":""}`}</text>)}
        </motion.g>
        {ordered.map((l, i) => {
          const position = arenaPosition(l.value, effectiveView);
          const effect = overtakeFrame?.rivalEffects[l.id];
          const charging =
            l.you && animating ? (overtakeFrame?.charging ?? 0) : 0;
          const row = sortedByValue.findIndex((lane) => lane.id === l.id);
          const rank = 1 + sortedByValue.filter((lane) => lane.value > l.value + 0.000001).length;
          const point = course.point(l.value, i, 0, true);
          const targetY = standings ? 48 + row * 76 : point.y + (l.you ? charging * 4 * course.markerScale : 0);
          const targetX = standings ? 38 : point.x + (effect?.joltX ?? 0) * course.markerScale;
          const edge = !course.oval && position.edge;
          const markerScale = standings || edge ? 1 : course.markerScale;
          const xx = 0, yy = 0;
          const active = selected === l.id || l.you;
          const headHalf = 29 * (standings ? polishedLaneScale(Boolean(l.you)) : 1);
          const pennantWidth=146;
          const visibleLeft=host.current?.scrollLeft??0;
          const pennantX=Math.max(visibleLeft-targetX+8,Math.min(visibleLeft+size.width-targetX-pennantWidth-8,l.you?-pennantWidth-12:12));
          const pennantY=athletePennantOffset(targetY,course.point(yourValue,Math.max(0,ordered.findIndex(peer=>peer.you)),0,true).y,Boolean(l.you),height);
          return (
            <motion.g
              key={l.id}
              initial={false}
              animate={{ x: targetX, y: targetY }}
              transition={{ duration: reduced || cameraChanged || drag.current || animating || previousGeometry.current?.width !== size.width ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
              data-athlete={l.id}
              role="button"
              aria-pressed={selected === l.id}
              tabIndex={0}
              aria-label={`${course.oval && !standings ? `${fieldLap(l.value, unit).laps} completed laps, ` : ""}${l.name}, ${standings ? `place ${rank}, ${scores[l.id] != null ? `${effortRankBadge(scores[l.id]).name} level, ` : ""}` : ""}${formatLastUpdated(l)}, ${relativeDistance(l.value)} relative to you${!standings && edge ? `, ${position.edge} of visible range` : ""}`}
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
              {/* Clip only the wake, in racer-local coordinates; the head must stay
                  visible at field edges and throughout the standings transition. */}
              {standings || !edge ? (
                <PolishedRacer sizeScale={standings ? undefined : 1} x={xx} y={yy} you={Boolean(l.you)} gold={rank === 1} active={active}
                  showWake={!standings} wakeBottom={course.oval ? undefined : (maxTailY-targetY)/markerScale} time={wakeTime}/>
              ) : <circle r={18} fill="white" stroke="#616c63" strokeDasharray="3 3"/>}
              <rect className="focus-racer-focus-ring" x={-23} y={-headHalf-3} width={46} height={headHalf*2+6} rx={23} fill="none" stroke="#f1c75b" strokeWidth={2}/>
              <rect x={xx - 24 / markerScale} y={yy - Math.max(22 / markerScale, headHalf + 4)} width={48 / markerScale} height={Math.max(44 / markerScale, headHalf * 2 + 8)} rx="24" fill="transparent"/>
              {standings && l.avatarUrl && <UserAvatarSvg src={l.avatarUrl} name={l.name} x={xx-17} y={yy-17} />}
              {((standings && !l.avatarUrl) || (!standings && edge)) && <text style={typographyStyle("caption")} x={xx} y={yy+4} textAnchor="middle" className="lane-initial" fill="#282f2c">{!standings&&edge?(edge==="ahead"?"↑":"↓"):l.initials}</text>}
              </g>
              {!standings&&edge&&<g pointerEvents="none"><rect x={-34} y={edge==="ahead"?27:-42} width={68} height={20} rx={8} fill="#ffffffee"/><text style={typographyStyle("caption")} x={0} y={edge==="ahead"?41:-28} textAnchor="middle"  fill="#616c63">{relativeDistance(l.value)}</text></g>}
              {!standings && !edge && (l.you || selected===l.id) && <g className="athlete-pennant" pointerEvents="none">
                <path d={`M0 0 L${pennantX+pennantWidth/2} ${pennantY>0?pennantY:pennantY+46}`} fill="none" stroke="#819486" strokeWidth="1.2"/>
                <rect x={pennantX} y={pennantY+2} width={pennantWidth} height={46} rx={12} fill="#282f2c" opacity={.1}/>
                <rect x={pennantX} y={pennantY} width={pennantWidth} height={46} rx={12} fill="#ffffff" stroke={l.you?"#f1c75b":"#e0e5dc"}/>
                <circle cx={pennantX+24} cy={pennantY+23} r={16} fill="#eef0e9"/>
                {l.avatarUrl ? <><defs><clipPath id={`${prefix}-portrait-${i}`}><circle cx={pennantX+24} cy={pennantY+23} r={16}/></clipPath></defs><image href={l.avatarUrl} x={pennantX+8} y={pennantY+7} width={32} height={32} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${prefix}-portrait-${i})`}/></> : <path d={PERSON_ICON_PATH} transform={`translate(${pennantX+14} ${pennantY+13}) scale(.83)`} fill="none" stroke="#616c63" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>}
                <text style={typographyStyle("caption")} x={pennantX+47} y={pennantY+20}  fill="#282f2c" >{l.you?"You":l.name.length>13?`${l.name.slice(0,12)}…`:l.name}</text>
                <text style={typographyStyle("caption")} x={pennantX+47} y={pennantY+35}  fill="#616c63">{ordinalPlace(rank)} · {l.you?`${l.value.toFixed(1)} ${unit}`:relativeDistance(l.value)}</text>
              </g>}
              <g aria-hidden={!standings} display={standings ? "inline" : "none"}>
              <motion.g initial={false} animate={{ opacity: standings ? 1 : 0 }}>
                <rect x={-30} y={-33} width={Math.max(200, width - 16)} height={70} rx={14} fill="transparent" />
                <line x1={-22} x2={width - 52} y1={38} y2={38} stroke="#e0e5dc" />
                <text style={typographyStyle("caption")} x={40} y={4} fill="#616c63" >{rank}</text>
                <text style={typographyStyle("caption")} x={64} y={-5} fill="#282f2c"  >{l.you ? selfLaneLabel(l.name) : l.name}{scores[l.id] != null ? ` ${effortRankBadge(scores[l.id]).symbol}` : ""}</text>
                <text style={typographyStyle("caption")} x={64} y={15} fill="#a67c00" >{scores[l.id] ?? "—"} effort score</text>
                <text style={typographyStyle("caption")} x={width - 58} y={5} textAnchor="end" fill="#282f2c"  >{l.value.toFixed(1)} {unit}</text>
              </motion.g>
              </g>
            </motion.g>
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

        <text style={typographyStyle("caption")} opacity={standings ? 0 : 1} x="18" y={height - 18} className="lane-distance">
          {course.oval ? `${fieldLap(yourValue, unit).laps} laps + ${(yourValue % (unit === "pts" ? 20 : 1)).toFixed(1)} ${unit} · ${yourValue.toFixed(1)} ${unit} total` : "Drag ↕ distance · ↔ lanes · tap track to expand"}
        </text>
      </svg>
    </div>
    {!standings && !course.oval && <svg aria-hidden="true" width={42} height={height} style={{ position: "absolute", right: 0, top: 0, pointerEvents: "none" }}>{fieldScaleScene(course, unit).map(drawFieldNode)}</svg>}
    </div>
  );
}
