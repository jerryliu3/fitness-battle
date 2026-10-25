"use client";
import { typographyStyle } from "@/ui/section";

import { useEffect, useId, useRef, useState } from "react";
import {
  portraitField,
  type ArenaSceneLane,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
import { drawFieldNode } from "../field/components/field-course";

/** Separate portrait renderer; the Three.js pursuit remains available independently. */
export function PortraitField({
  lanes,
  view,
  unit,
  selectedId,
  immersive = false,
  onExpand,
  onToggleDimension,
  onZoom,
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
  onSelect: (id: string) => void;
}) {
  const [laneOffset, setLaneOffset] = useState(0);
  const prefix = useId().replace(/:/g, "");
  const scene = portraitField(lanes, view, undefined, laneOffset, prefix);
  const prevSelectedRef = useRef<string | undefined>(selectedId);
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
    moved: boolean;
  } | null>(null);
  const moved = useRef(false);
  return (
    <div className="club-perspective-group">
    <div className={immersive ? "club-perspective-board is-immersive" : "club-perspective-board"}>
      <img
        className="club-perspective-scenery"
        src="/club/alpine-trail.jpg"
        alt=""
      />
      <svg
        className="club-perspective-svg"
        viewBox="0 0 420 600"
        preserveAspectRatio="xMidYMid slice"
        aria-label="Fixed perspective competition field"
        role="group"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            focus: scene.focus,
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
            Math.abs(dx) > 8 &&
            Math.abs(dx) > Math.abs(dy) * 1.3
          ) {
            d.moved = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          if (d.moved) {
            moved.current = true;
            setLaneOffset(
              Math.max(
                0,
                Math.min(scene.ordered.length - 1, d.focus - dx / 110),
              ) - scene.baseFocus,
            );
          }
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
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
            <stop offset="0%" stopColor="#0b242c" stopOpacity="0" />
            <stop offset="34%" stopColor="#0b3038" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#0b3038" />
          </linearGradient>
        </defs>
        <rect y={52} width={420} height={548} fill={`url(#${prefix}-shade)`} />
        {scene.ground.map(drawFieldNode)}
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
          .filter((m) => m.x > 28 && m.x < 392)
          .sort((a, b) => a.y - b.y)
          .map((m, i) => {
            const id = `${prefix}-portrait-${i}`;
            return (
              <g
                key={m.id}
                transform={`translate(${m.x} ${m.y}) scale(${m.scale})`}
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
      <div className="club-board-controls">
        <div className="club-board-zoom">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={view.span >= (unit === "pts" ? 100 : 40)}
            onClick={() =>
              onZoom(Math.min(unit === "pts" ? 100 : 40, view.span * 1.5))
            }
          >
            −
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={view.span <= (unit === "pts" ? 2 : 0.5)}
            onClick={() =>
              onZoom(Math.max(unit === "pts" ? 2 : 0.5, view.span / 1.5))
            }
          >
            ＋
          </button>
        </div>
        {!immersive ? (
          <div className="club-board-peers">
            <button
              type="button"
              aria-label="Previous lane"
              disabled={scene.focus <= 0}
              onClick={() => shift(-1)}
            >
              ←
            </button>
            <button type="button" onClick={() => setLaneOffset(0)}>
              Your lane
            </button>
            <button
              type="button"
              aria-label="Next lane"
              disabled={scene.focus >= scene.ordered.length - 1}
              onClick={() => shift(1)}
            >
              →
            </button>
          </div>
        ) : null}
      </div>
    </div>
    </div>
  );
}
