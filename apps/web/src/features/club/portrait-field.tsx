"use client";
import { typographyStyle, AppText  } from "@/ui/section";

import { useFieldGestures } from "../field/use-field-gestures";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  orderedArenaLanes,
  portraitField,
  portraitDepthAt,
  portraitPanDepthAt,
  portraitScaleAtDepth,
  portraitFieldGap,
  competeAthleteTrailColors,
  fieldFlightDuration, fieldFlightEase, pinchFieldView,
  type ArenaSceneLane,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
import { drawFieldNode } from "../field/components/field-course";

/** Lightweight distance-plane renderer shared with native. */
export function PortraitField({
  lanes,
  view,
  unit,
  selectedId,
  focusOnMount = false,
  immersive = false,
  onExpand,
  onToggleDimension,
  onZoom,
  onPan,
  onSelect,
  focusRequest = 0,
  onViewChange,
  onGestureStart,
}: {
  focusRequest?: number;
  onViewChange?: (view: ArenaViewWindow) => void;
  onGestureStart?: () => void;
  lanes: ArenaSceneLane[];
  view: ArenaViewWindow;
  unit: string;
  selectedId?: string;
  focusOnMount?: boolean;
  immersive?: boolean;
  onExpand?: () => void;
  onToggleDimension?: () => void;
  onZoom: (span: number) => void;
  onPan: (center: number) => void;
  onSelect: (id: string) => void;
}) {
  const [laneOffset, setLaneOffset] = useState(() => {
    const ordered = orderedArenaLanes(lanes);
    return Math.max(0, ordered.findIndex(l => l.id === selectedId)) - Math.max(0, ordered.findIndex(l => l.you));
  });
  const prefix = useId().replace(/:/g, "");
  const scene = useMemo(() => portraitField(lanes, view, undefined, laneOffset, prefix), [lanes, view.center, view.span, laneOffset, prefix]);
  const prevSelectedRef = useRef(focusOnMount ? "" : `${selectedId}:${focusRequest}`);
  const [exploreEnabled, setExploring] = useState(false);
  const exploring = immersive || exploreEnabled;
  const svg = useRef<SVGSVGElement>(null);
  const latest = useRef({ onPan, onZoom, onViewChange, view, scene, exploring });
  latest.current = { onPan, onZoom, onViewChange, view, scene, exploring };
  const shift = (d: number) => {
    interruptTravel();
    setLaneOffset(
      Math.max(0, Math.min(scene.ordered.length - 1, scene.focus + d)) -
        scene.baseFocus,
    );
  };
  const travel = useRef<number | null>(null);
  const stopTravel = () => { if (travel.current !== null) cancelAnimationFrame(travel.current); travel.current = null; };
  const interruptTravel = () => { stopTravel(); onGestureStart?.(); };
  const panTo = (center: number) => { interruptTravel(); onPan(center); };
  const zoomTo = (span: number) => { interruptTravel(); onZoom(span); };
  useEffect(() => () => stopTravel(), []);
  useEffect(() => {
    const key = `${selectedId}:${focusRequest}`;
    if (!selectedId || key === prevSelectedRef.current) return;
    prevSelectedRef.current = key;
    const focus = scene.ordered.findIndex((lane) => lane.id === selectedId);
    if (focus < 0) return;
    stopTravel();
    const target = focus - scene.baseFocus, from = laneOffset;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setLaneOffset(target); return; }
    const started = performance.now(), duration = fieldFlightDuration(view, view, target - from);
    const tick = (now: number) => { const t = Math.min(1, (now - started) / duration); setLaneOffset(from + (target - from) * fieldFlightEase(t)); travel.current = t < 1 ? requestAnimationFrame(tick) : null; };
    travel.current = requestAnimationFrame(tick);
  }, [selectedId, focusRequest, scene.baseFocus, scene.ordered]);
  const gestures = useFieldGestures({
    surface: svg, view, unit, enabled: exploring,
    lateral: () => latest.current.scene.focus,
    onStart: () => { stopTravel(); onGestureStart?.(); },
    onTap: (_event, target) => { const id = (target as Element)?.closest("[data-athlete]")?.getAttribute("data-athlete"); if (id) onSelect(id); },
    onMove: gesture => {
      const node = svg.current;
      if (!node) return;
      const screen = node.getScreenCTM();
      if (!screen) return;
      // The scene keeps its aspect ratio. Convert through its actual screen
      // transform, including letterboxing and browser/CSS scaling.
      const inverse = screen.inverse();
      const from = new DOMPoint(gesture.from.x, gesture.from.y).matrixTransform(inverse);
      const to = new DOMPoint(gesture.to.x, gesture.to.y).matrixTransform(inverse);
      const depth = portraitDepthAt(from.y);
      const nextDepth = portraitDepthAt(to.y);
      const offset = Math.max(0, Math.min(scene.ordered.length - 1, gesture.lateral - (to.x - from.x) / (222 * portraitScaleAtDepth(depth)))) - scene.baseFocus;
      setLaneOffset(offset);
      if (exploring || gesture.pinching) {
        const next = pinchFieldView(gesture.view, gesture.span, depth, nextDepth);
        if (!gesture.pinching) next.center = gesture.view.center + (portraitPanDepthAt(to.y) - portraitPanDepthAt(from.y)) * gesture.view.span;
        if (onViewChange) onViewChange(next); else { if (gesture.pinching) onZoom(next.span); onPan(next.center); }
        return { view: next, lateral: offset + scene.baseFocus };
      }
      return { view: gesture.view, lateral: offset + scene.baseFocus };
    },
  });
  return (
    <div className={immersive ? "club-perspective-group is-immersive" : "club-perspective-group"}>
      <div className="club-board-status">
        <b>
          {scene.place} / {scene.fieldSize} <AppText as="small" role="caption" secondary>PLACE</AppText>
        </b>
        <span>{portraitFieldGap(scene.nextGap, unit)}</span>
      </div>
    <div className={immersive ? "club-perspective-board is-immersive" : "club-perspective-board"}>
      <img
        className="club-perspective-scenery"
        src="/club/alpine-trail.jpg"
        alt=""
      />
      {!immersive && (onToggleDimension || onExpand) ? (
        <div className="focus-portal-actions">
          {onToggleDimension ? (
            <button
              type="button"
              className="focus-portal-pill"
              aria-label="Switch to 2D map"
              onClick={onToggleDimension}
            >
              3D
            </button>
          ) : null}
          {onExpand ? (
            <button
              type="button"
              className="focus-portal-pill is-accent"
              aria-label="Expand 3D field to full screen"
              onClick={onExpand}
            >
              Full Arena ⤢
            </button>
          ) : null}
        </div>
      ) : null}
      <svg
        ref={svg}
        style={{ touchAction: exploring || immersive ? "none" : "pan-y" }}
        tabIndex={0}
        onKeyDown={e => {
          if (e.target !== e.currentTarget) return;
          if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home"].includes(e.key)) return;
          e.preventDefault();
          if (e.key === "ArrowUp" || e.key === "ArrowDown") panTo(view.center + (e.key === "ArrowUp" ? 1 : -1) * view.span / 4);
          else if (e.key === "Home") { onSelect(lanes.find(l => l.you)?.id ?? ""); }
          else shift(e.key === "ArrowRight" ? 1 : -1);
        }}
        className="club-perspective-svg"
        viewBox="0 0 420 600"
        preserveAspectRatio="xMidYMid meet"
        aria-label="Distance perspective field. Arrow keys browse distances and lanes; Home returns to you."
        role="group"
        {...gestures}
      >
        <defs>
          <linearGradient id={`${prefix}-shade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b3038" stopOpacity="0" />
            <stop offset="100%" stopColor="#0b3038" />
          </linearGradient>
        </defs>
        <rect y={80} width={420} height={520} fill={`url(#${prefix}-shade)`} />
        {scene.ground.map(drawFieldNode)}
        {scene.ticks.map(t => <g key={t.value} pointerEvents="none"><rect x={4} y={t.y - 10} width={78} height={20} rx={6} fill="#103e46"/><text x={12} y={t.y + 4} fill="#f8f9f6" style={typographyStyle("caption")}>{t.value === 0 ? "START" : `${t.value.toLocaleString("en-US", { maximumFractionDigits: 3 })} ${unit}`}</text></g>)}
        <defs>
          <linearGradient id={`${prefix}-horizon`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b4d3cd" stopOpacity={0} />
            <stop offset="55%" stopColor="#b4d3cd" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#b4d3cd" stopOpacity={0} />
          </linearGradient>
        </defs>
        <rect
          y={126}
          width={420}
          height={110}
          fill={`url(#${prefix}-horizon)`}
        />
        {[...scene.trails].sort((a, b) =>
          (a.id === selectedId ? 2 : a.you ? 1 : 0) - (b.id === selectedId ? 2 : b.you ? 1 : 0)
        ).map(m => {
          const trail = competeAthleteTrailColors(Boolean(m.you), Boolean(m.ghost));
          return <path key={`trail-${m.id}`} pointerEvents="none" d={m.trail}
            stroke={trail.stroke} strokeWidth={trail.strokeWidth} opacity={trail.strokeOpacity}
            vectorEffect="non-scaling-stroke" strokeLinecap="round" fill="none" />;
        })}
        {scene.markers
          .filter((m) => m.x > 22 && m.x < 398)
          .sort((a, b) => a.y - b.y)
          .map((m, i) => {
            const id = `${prefix}-portrait-${i}`;
            const markerTrail = m.trail
              ? competeAthleteTrailColors(Boolean(m.you), Boolean(m.ghost))
              : null;
            return (
              <g
                key={m.id}
                transform={`translate(${m.x} ${m.y - 27 * m.scale}) scale(${m.scale})`}
                role="button"
                tabIndex={0}
                aria-label={`${m.name}${m.you ? ", you" : ""}, ${m.gap > 0 ? "+" : ""}${m.gap.toFixed(1)} ${unit}${m.outside ? ", outside visible distance range" : ""}`}
                data-athlete={m.id}
                onClick={event => { if (event.detail === 0) onSelect(m.id); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(m.id);
                  }
                }}
              >
                <rect x={-30 / m.scale} y={-45 / m.scale} width={60 / m.scale} height={90 / m.scale} fill="transparent" />
                {!m.ghost && m.trail ? (
                  <circle
                    cx={0}
                    cy={27}
                    r={7}
                    fill={markerTrail!.dotFill}
                    stroke={markerTrail!.dotStroke}
                    strokeWidth={3}
                  />
                ) : (
                  <>
                    <ellipse
                      cy={27}
                      rx={24}
                      ry={10}
                      fill={m.color}
                      opacity={0.16}
                    />
                    <ellipse
                      cy={27}
                      rx={16}
                      ry={6}
                      fill="#143c43"
                      stroke={m.color}
                      strokeWidth={2.5}
                    />
                    <ellipse cy={27} rx={5} ry={2} fill={m.color} />
                  </>
                )}
                <path
                  d="M-9 12 L0 27 L9 12"
                  fill={m.you ? "#f7c948" : "#f8f9f6"}
                />
                <rect
                  x={-23}
                  y={-43}
                  width={46}
                  height={58}
                  rx={12}
                  fill="#f8f9f6"
                  stroke={m.you ? "#f7c948" : "#b3c9c5"}
                  strokeWidth={m.you ? 3 : 1.5}
                />
                <defs>
                  <clipPath id={id}>
                    <rect x={-19} y={-39} width={38} height={50} rx={9} />
                  </clipPath>
                </defs>
                {m.avatarUrl ? (
                  <image
                    href={m.avatarUrl}
                    x={-19}
                    y={-39}
                    width={38}
                    height={50}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#${id})`}
                  />
                ) : (
                  <>
                    <rect
                      x={-19}
                      y={-39}
                      width={38}
                      height={50}
                      rx={9}
                      fill={m.you ? "#f7c948" : "#d8e5df"}
                    />
                    <text style={typographyStyle("caption")}
                      y={-8}
                      textAnchor="middle"
                      fill="#142b3b"

                    >
                      {m.initials}
                    </text>
                  </>
                )}
                <g className="athlete-pennant">
                {m.you ? (
                  <>
                    <rect
                      x={-22}
                      y={-66}
                      width={44}
                      height={18}
                      rx={9}
                      fill="#f7c948"
                    />
                    <text style={typographyStyle("caption")}
                      y={-53}
                      textAnchor="middle"
                      fill="#142b3b"

                    >
                      YOU
                    </text>
                  </>
                ) : null}
                <text style={typographyStyle("caption")}
                  y={45}
                  textAnchor="middle"
                  fill="white"

                >
                  {m.ghost ? "Past you" : m.you ? "You" : m.name.split(" ")[0]}
                </text>
                {!m.you ? (
                  <text style={typographyStyle("caption")} y={61} textAnchor="middle" fill="#e5eee5" >
                    {m.outside ? `${m.direction} ` : ""}
                    {m.gap > 0 ? "+" : ""}
                    {m.gap.toFixed(unit === "pts" ? 0 : 2)} {unit}
                  </text>
                ) : null}
                </g>
              </g>
            );
          })}
      </svg>
      <div className="club-field-explore" style={{ pointerEvents: "none" }}>
        {!immersive && <button type="button" style={{ pointerEvents: "auto" }} aria-pressed={exploring} onClick={() => setExploring(!exploring)}>{exploring ? "Done" : "Explore"}</button>}
        <span>{exploring ? "Drag to move · Pinch to zoom" : "Swipe across lanes · Explore to move forward"}</span>
      </div>
    </div>
      <div className="club-field-offscreen">
        {(["↑", "↓"] as const).map(direction => {
          const peers = scene.outside.filter(m => m.direction === direction && !m.ghost);
          if (!peers.length) return null;
          const nearest = peers.reduce((a,b) => Math.abs(a.value-view.center) < Math.abs(b.value-view.center) ? a : b);
          return <button type="button" key={direction} onClick={() => { onSelect(nearest.id); }}>{direction} {peers.length} {direction === "↑" ? "ahead" : "behind"} · {nearest.name.split(" ")[0]} {`${nearest.edgeGap.toFixed(1)} ${unit} from view`}</button>;
        })}
      </div>
      <div className="club-board-controls club-distance-controls">
        <div className="club-board-peers">
          <button type="button" aria-label="Previous lane" disabled={scene.focus <= 0} onClick={() => shift(-1)}>←</button>
          <button type="button" aria-label="Move backward" disabled={scene.min <= 0} onClick={() => panTo(view.center - view.span / 3)}>↓</button>
          <button type="button" onClick={() => { onSelect(lanes.find(l => l.you)?.id ?? ""); }}>You</button>
          <button type="button" aria-label="Move forward" onClick={() => panTo(view.center + view.span / 3)}>↑</button>
          <button type="button" aria-label="Next lane" disabled={scene.focus >= scene.ordered.length - 1} onClick={() => shift(1)}>→</button>
        </div>
        <div className="club-board-zoom">
          <button type="button" aria-label="Zoom out" disabled={view.span >= (unit === "pts" ? 100 : 40)} onClick={() => zoomTo(Math.min(unit === "pts" ? 100 : 40, view.span * 1.5))}>−</button>
          <span aria-live="off">{Math.max(0, scene.min).toFixed(unit === "pts" ? 0 : 2)}–{scene.max.toFixed(unit === "pts" ? 0 : 2)} {unit}</span>
          <button type="button" aria-label="Zoom in" disabled={view.span <= (unit === "pts" ? 2 : 0.5)} onClick={() => zoomTo(Math.max(unit === "pts" ? 2 : 0.5, view.span / 1.5))}>＋</button>
        </div>
      </div>
    </div>
  );
}
