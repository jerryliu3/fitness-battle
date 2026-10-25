"use client";
import { typographyStyle, AppText  } from "@/ui/section";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  portraitField,
  portraitDepthAt,
  portraitFieldGap,
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
  immersive = false,
  onExpand,
  onToggleDimension,
  onZoom,
  onPan,
  onSelect,
}: {
  lanes: ArenaSceneLane[];
  view: ArenaViewWindow;
  unit: string;
  selectedId?: string;
  immersive?: boolean;
  onExpand?: () => void;
  onToggleDimension?: () => void;
  onZoom: (span: number) => void;
  onPan: (center: number) => void;
  onSelect: (id: string) => void;
}) {
  const [laneOffset, setLaneOffset] = useState(0);
  const prefix = useId().replace(/:/g, "");
  const scene = useMemo(() => portraitField(lanes, view, undefined, laneOffset, prefix), [lanes, view.center, view.span, laneOffset, prefix]);
  const prevSelectedRef = useRef<string | undefined>(selectedId);
  const [exploring, setExploring] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const latest = useRef({ onPan, view, scene });
  latest.current = { onPan, view, scene };
  const pending = useRef<{ offset: number; center: number } | null>(null);
  const frame = useRef<number | null>(null);
  const queue = (offset: number, center: number) => {
    pending.current = { offset, center };
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const next = pending.current;
      pending.current = null;
      if (!next) return;
      setLaneOffset(next.offset);
      if (exploring) latest.current.onPan(next.center);
    });
  };
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);

  useEffect(() => {
    const node = svg.current;
    if (!node || !exploring) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const p = latest.current;
      const pixels = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1;
      const center = (pending.current?.center ?? p.view.center) + event.deltaY * pixels / node.clientHeight * p.view.span;
      const offset = (pending.current?.offset ?? p.scene.focus - p.scene.baseFocus) + event.deltaX * pixels / 110;
      queue(Math.max(-p.scene.baseFocus, Math.min(p.scene.ordered.length - 1 - p.scene.baseFocus, offset)), center);
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, [exploring]);

  const shift = (d: number) =>
    setLaneOffset(
      Math.max(0, Math.min(scene.ordered.length - 1, scene.focus + d)) -
        scene.baseFocus,
    );
  useEffect(() => {
    if (!selectedId || selectedId === prevSelectedRef.current) {
      prevSelectedRef.current = selectedId;
      return;
    }
    prevSelectedRef.current = selectedId;
    const focus = scene.ordered.findIndex((lane) => lane.id === selectedId);
    if (focus < 0) return;
    setLaneOffset(focus - scene.baseFocus);
  }, [selectedId, scene.baseFocus, scene.ordered]);
  const drag = useRef<{
    x: number;
    y: number;
    focus: number;
    center: number;
    span: number;
    height: number;
    width: number;
    top: number;
    moved: boolean;
  } | null>(null);
  const moved = useRef(false);
  return (
    <div className="club-perspective-group">
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
        style={{ touchAction: exploring ? "none" : "pan-y" }}
        tabIndex={0}
        onKeyDown={e => {
          if (e.target !== e.currentTarget) return;
          if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home"].includes(e.key)) return;
          e.preventDefault();
          if (e.key === "ArrowUp" || e.key === "ArrowDown") onPan(view.center + (e.key === "ArrowUp" ? 1 : -1) * view.span / 4);
          else if (e.key === "Home") { setLaneOffset(0); onPan(lanes.find(l => l.you)?.value ?? 0); }
          else shift(e.key === "ArrowRight" ? 1 : -1);
        }}
        className="club-perspective-svg"
        viewBox="0 0 420 600"
        aria-label="Distance perspective field. Arrow keys browse distances and lanes; Home returns to you."
        role="group"
        onPointerDown={(e) => {
          if (e.button !== 0 || !e.isPrimary) return;
          const rect = e.currentTarget.getBoundingClientRect();
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            focus: scene.focus,
            center: view.center,
            span: view.span,
            height: rect.height,
            width: rect.width,
            top: rect.top,
            moved: false,
          };
          moved.current = false;
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x,
            dy = e.clientY - d.y;
          if (
            !d.moved &&
            Math.hypot(dx, dy) > 8 &&
            (exploring || Math.abs(dx) > Math.abs(dy) * 1.3)
          ) {
            d.moved = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          if (d.moved) {
            moved.current = true;
            const depth = portraitDepthAt((d.y - d.top) / d.height * 600);
            const offset = Math.max(0, Math.min(scene.ordered.length - 1, d.focus - dx / d.width * 420 / (110 / (2 - depth)))) - scene.baseFocus;
            queue(offset, d.center + (portraitDepthAt((e.clientY - d.top) / d.height * 600) - depth) * d.span);
          }
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => { drag.current = null; }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onClickCapture={(e) => {
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
          }
        }}
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
        {scene.markers.map((m) => (
          <g key={`trail-${m.id}`} pointerEvents="none">
            <path
              d={m.trail}
              stroke={m.color}
              strokeWidth={12}
              opacity={0.12}
              fill="none"
            />
            <path
              d={m.trail}
              stroke={m.color}
              strokeWidth={5}
              opacity={m.ghost ? 0.4 : 0.8}
              strokeDasharray={m.ghost ? "5 6" : undefined}
              fill="none"
            />
          </g>
        ))}
        {scene.markers
          .filter((m) => m.x > 22 && m.x < 398)
          .sort((a, b) => a.y - b.y)
          .map((m, i) => {
            const id = `${prefix}-portrait-${i}`;
            return (
              <g
                key={m.id}
                transform={`translate(${m.x} ${m.y - 27 * m.scale}) scale(${m.scale})`}
                role="button"
                tabIndex={0}
                aria-label={`${m.name}${m.you ? ", you" : ""}, ${m.gap > 0 ? "+" : ""}${m.gap.toFixed(1)} ${unit}${m.outside ? ", outside visible distance range" : ""}`}
                onClick={() => onSelect(m.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(m.id);
                  }
                }}
              >
                <rect x={-30 / m.scale} y={-45 / m.scale} width={60 / m.scale} height={90 / m.scale} fill="transparent" />
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
            );
          })}
      </svg>
      <div className="club-field-explore">
        <button type="button" aria-pressed={exploring} onClick={() => setExploring(!exploring)}>{exploring ? "Done" : "Explore"}</button>
        <span>{exploring ? "Drag in any direction" : "Swipe across lanes · Explore to move forward"}</span>
      </div>
    </div>
      <div className="club-field-offscreen">
        {(["↑", "↓"] as const).map(direction => {
          const peers = scene.outside.filter(m => m.direction === direction && !m.ghost);
          if (!peers.length) return null;
          const nearest = peers.reduce((a,b) => Math.abs(a.value-view.center) < Math.abs(b.value-view.center) ? a : b);
          return <button type="button" key={direction} onClick={() => { setLaneOffset(scene.ordered.findIndex(l => l.id === nearest.id) - scene.baseFocus); onSelect(nearest.id); }}>{direction} {peers.length} {direction === "↑" ? "ahead" : "behind"} · {nearest.name.split(" ")[0]} {nearest.you ? "your position" : `${Math.abs(nearest.gap).toFixed(unit === "pts" ? 0 : 2)} ${unit} ${nearest.gap >= 0 ? "ahead of you" : "behind you"}`}</button>;
        })}
      </div>
      <div className="club-board-controls club-distance-controls">
        <div className="club-board-peers">
          <button type="button" aria-label="Previous lane" disabled={scene.focus <= 0} onClick={() => shift(-1)}>←</button>
          <button type="button" aria-label="Move backward" disabled={scene.min <= 0} onClick={() => onPan(view.center - view.span / 3)}>↓</button>
          <button type="button" onClick={() => { setLaneOffset(0); onPan(lanes.find(l => l.you)?.value ?? 0); }}>You</button>
          <button type="button" aria-label="Move forward" onClick={() => onPan(view.center + view.span / 3)}>↑</button>
          <button type="button" aria-label="Next lane" disabled={scene.focus >= scene.ordered.length - 1} onClick={() => shift(1)}>→</button>
        </div>
        <div className="club-board-zoom">
          <button type="button" aria-label="Zoom out" disabled={view.span >= (unit === "pts" ? 100 : 40)} onClick={() => onZoom(Math.min(unit === "pts" ? 100 : 40, view.span * 1.5))}>−</button>
          <span aria-live="off">{Math.max(0, scene.min).toFixed(unit === "pts" ? 0 : 2)}–{scene.max.toFixed(unit === "pts" ? 0 : 2)} {unit}</span>
          <button type="button" aria-label="Zoom in" disabled={view.span <= (unit === "pts" ? 2 : 0.5)} onClick={() => onZoom(Math.max(unit === "pts" ? 2 : 0.5, view.span / 1.5))}>＋</button>
        </div>
      </div>
    </div>
  );
}
