"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { colors as c } from "@/theme/app-colors";
import {
  competeChartPreview,
  buildCompeteTimeSeriesModel,
  buildSleepTimeSeriesModel,
  clamp,
  competeNow,
  freshState,
  type CompeteState,
  type CompeteTimeSeriesModel,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { playCue } from "@/lib/haptics";
import { typographyStyle } from "@/ui/section";

export function CompeteTimeSeriesChart({
  state,
  now,
  sport,
  track = "open",
  mode = "sport",
  selectedId,
  onSelectAthlete,
  hiddenIds,
  reserveTopControls = false,
  compact = false,
  immersive = false,
  timelineFraction,
  onTimelineChange,
}: {
  state?: CompeteState | null;
  now?: Date;
  sport?: SportId;
  track?: ScoreTrack;
  mode?: "sport" | "sleep";
  selectedId?: string | null;
  onSelectAthlete?: (id: string) => void;
  hiddenIds?: readonly string[];
  reserveTopControls?: boolean;
  compact?: boolean;
  immersive?: boolean;
  timelineFraction?: number | null;
  onTimelineChange?: (value: number | null) => void;
}) {
  const [plotHeight, setPlotHeight] = useState(204);
  useEffect(() => {
    const resize = () => setPlotHeight(immersive ? Math.max(240, window.innerHeight - 380) : 204);
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [immersive]);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    null,
  );
  const [internalFraction, setInternalFraction] = useState<number | null>(null);
  const scrubFraction = timelineFraction !== undefined ? timelineFraction : internalFraction;
  const setScrubFraction = onTimelineChange ?? setInternalFraction;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const lastBucketRef = useRef<number | null>(null);

  const activeSelectedId =
    selectedId !== undefined ? selectedId : internalSelectedId;

  const model: CompeteTimeSeriesModel = useMemo(() => {
    const safeState = state ?? freshState(now);
    const effectiveNow = now ?? competeNow(safeState);
    if (mode === "sleep") {
      return buildSleepTimeSeriesModel(safeState, effectiveNow, {
        height: plotHeight,
        hiddenIds,
        selectedAthleteId: activeSelectedId,
        scrubFraction,
      });
    }
    return buildCompeteTimeSeriesModel(
      safeState,
      sport ?? safeState.primary,
      track,
      effectiveNow,
      {
        height: plotHeight,
        hiddenIds,
        selectedAthleteId: activeSelectedId,
        scrubFraction,
      },
    );
  }, [
    state,
    now,
    sport,
    track,
    mode,
    hiddenIds,
    activeSelectedId,
    scrubFraction,
    plotHeight,
  ]);

  const handleSelectAthlete = (id: string) => {
    void playCue("selection");
    if (selectedId === undefined) {
      setInternalSelectedId(id);
    }
    onSelectAthlete?.(id);
  };

  const updateScrubFromClientX = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return;
    const svgX = ((clientX - rect.left) / rect.width) * model.width;
    const rawFraction =
      (svgX - model.left) / Math.max(1, model.right - model.left);
    const clamped = clamp(0, model.nowFraction, rawFraction);
    const bucket = Math.floor(clamped * 14);
    if (lastBucketRef.current !== bucket) {
      lastBucketRef.current = bucket;
      void playCue("selection");
    }
    setScrubFraction(clamped);
  };

  const clearScrub = () => {
    lastBucketRef.current = null;
    setScrubFraction(null);
  };

  const selectedStroke = model.selectedAthlete.you
    ? c.fieldTeal
    : c.podiumGold;
  const unselectedAthletes = model.athletes.filter((a) => !a.selected);

  if (compact) {
    const preview = competeChartPreview(model);
    return <svg aria-label="Current race position over the past day" role="img" viewBox={`0 0 ${preview.width} ${preview.height}`} style={{ display: "block", width: "100%", height: "100%", overflow: "hidden" }}>
      <rect width={preview.width} height={preview.height} fill={c.accentSecondarySoft} />
      <text style={typographyStyle("caption")} x={preview.left} y={16} fill={c.muted}>{model.unit}</text>
      {preview.yTicks.map(tick => <g key={tick.y}><line x1={preview.left} x2={preview.right} y1={tick.y} y2={tick.y} stroke={c.line} /><text style={typographyStyle("caption")} x={preview.left - 8} y={tick.y + 4} textAnchor="end" fill={c.muted}>{tick.label}</text></g>)}
      {preview.xTicks.map((tick, i) => <text style={typographyStyle("caption")} key={tick.label} x={tick.x} y={282} textAnchor={i ? "end" : "start"} fill={c.muted}>{tick.label}</text>)}
      {preview.athletes.map(athlete => <g key={athlete.id}>
        <polyline points={athlete.points} fill="none" stroke={athlete.selected ? c.chartSeries : c.accentSecondary} strokeWidth={athlete.selected ? 4 : 2} opacity={athlete.selected ? 1 : .65} />
        <circle cx={athlete.x} cy={athlete.y} r={athlete.selected ? 7 : 3} fill={athlete.selected ? c.chartSeries : c.accentSecondary} />
      </g>)}
    </svg>;
  }

  return (
    <div
      aria-label="Weekly competition time-series graph"
      style={{
        background: immersive ? c.accentSecondarySoft : c.card,
        borderRadius: immersive ? 0 : 20,
        border: immersive ? "none" : `1px solid ${c.line}`,
        padding: compact ? 8 : 16,
        paddingTop: immersive ? "calc(env(safe-area-inset-top) + 100px)" : reserveTopControls ? 64 : 16,
        display: "grid",
        gap: compact ? 6 : 10,
        color: c.ink,
      }}
    >
      {/* Pure Open Line Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
          <span
            style={{
              ...typographyStyle("caption"),
              color: c.muted,
            }}
          >
            {model.timeLabel}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <strong
              style={{
                ...typographyStyle("hero"),
                color: c.ink,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {model.selectedAthlete.formattedValueAtCursor}
              <small
                style={{
                  ...typographyStyle("body"),
                  color: c.muted,
                  marginLeft: 4,
                }}
              >
                {model.unit}
              </small>
            </strong>
            <span
              style={{
                ...typographyStyle("caption"),
                padding: "2px 8px",
                borderRadius: 6,
                background: model.selectedAthlete.you
                  ? "rgba(23, 108, 117, 0.1)"
                  : "rgba(247, 201, 72, 0.24)",
                color: model.selectedAthlete.you ? c.fieldTeal : c.ink,
              }}
            >
              {model.placeLabel}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            justifyItems: "end",
            gap: 2,
            paddingTop: 2,
            textAlign: "right",
          }}
        >
          <strong
            style={{
              ...typographyStyle("label"),
              color: c.ink,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {model.gapLabel}
          </strong>
          <span
            style={{
              ...typographyStyle("caption"),
              color: model.overtakeCount > 0 ? c.fieldTeal : c.muted,
            }}
          >
            {model.overtakeLabel}
          </span>
        </div>
      </div>

      {/* Time-Series SVG Plot */}
      <div
        style={{
          position: "relative",
          width: "100%",
          touchAction: compact ? "auto" : "pan-y",
          userSelect: "none",
          pointerEvents: compact ? "none" : "auto",
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${model.width} ${model.height}`}
          style={{
            display: "block",
            width: "100%",
            height: model.height,
            overflow: "visible",
            cursor: compact ? "default" : "ew-resize",
          }}
          onPointerMove={(event) => {
            updateScrubFromClientX(event.clientX);
          }}
          onPointerDown={(event) => {
            updateScrubFromClientX(event.clientX);
          }}
          onPointerUp={clearScrub}
          onPointerLeave={clearScrub}
          onPointerCancel={clearScrub}
        >
          {/* Future zone wash (now -> Sun) */}
          {model.nowX < model.right ? (
            <rect
              x={model.nowX}
              y={model.top - 4}
              width={Math.max(0, model.right - model.nowX)}
              height={model.bottom - model.top + 8}
              fill={c.paper}
              opacity={0.75}
              rx={4}
            />
          ) : null}

          {/* Horizontal Y gridlines & labels */}
          {model.yTicks.map((tick, idx) => (
            <g key={`y-${idx}`}>
              <line
                x1={model.left}
                x2={model.right}
                y1={tick.y}
                y2={tick.y}
                stroke={c.line}
                strokeWidth={0.8}
              />
              <text
                x={model.left - 6}
                y={tick.y + 3.5}
                textAnchor="end"
                fill={c.muted}
                style={typographyStyle("caption")}
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* X-axis day ticks (Mon - Sun) */}
          {model.dayTicks.map((day) => (
            <g key={`d-${day.index}`}>
              <line
                x1={day.x}
                x2={day.x}
                y1={model.top}
                y2={model.bottom}
                stroke={c.line}
                strokeWidth={0.6}
                strokeDasharray={day.future ? "2 3" : undefined}
              />
              <text
                x={day.x}
                y={model.height - 10}
                textAnchor="middle"
                fill={day.active ? c.ink : c.muted}
                style={typographyStyle(day.active ? "label" : "caption")}
                opacity={day.future ? 0.5 : 1}
              >
                {day.label}
              </text>
            </g>
          ))}

          {/* Active time cursor line */}
          <line
            x1={model.cursorX}
            x2={model.cursorX}
            y1={model.top - 4}
            y2={model.bottom}
            stroke={c.ink}
            strokeWidth={1}
            strokeDasharray={model.isScrubbing ? undefined : "2 3"}
            opacity={model.isScrubbing ? 0.45 : 0.25}
          />

          {/* Unselected background competitor traces */}
          {unselectedAthletes.map((athlete) => (
            <g
              key={athlete.id}
              style={{ cursor: "pointer" }}
              onClick={(event) => {
                event.stopPropagation();
                handleSelectAthlete(athlete.id);
              }}
            >
              <polyline
                points={athlete.polyline}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={1.35}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.32}
              />
              <circle
                cx={athlete.cursorX}
                cy={athlete.cursorY}
                r={2.5}
                fill="#94a3b8"
                opacity={0.45}
              />
            </g>
          ))}

          {/* Single Selected Athlete foreground trace */}
          <g key={`selected-${model.selectedAthlete.id}`}>
            <polyline
              points={model.selectedAthlete.polyline}
              fill="none"
              stroke={selectedStroke}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Overtake Crossover Nodes (drawn ONLY for the selected athlete) */}
          {model.overtakes.map((node) => (
            <g key={node.id}>
              <title>{`Passed ${node.passedName}`}</title>
              <circle
                cx={node.x}
                cy={node.y}
                r={4.8}
                fill="#fff5d1"
                stroke={c.tennis}
                strokeWidth={1.8}
              />
              <circle cx={node.x} cy={node.y} r={1.8} fill={c.ink} />
            </g>
          ))}

          {/* Selected Athlete Live/Cursor Tip Node + Pill */}
          <g>
            <circle
              cx={model.selectedAthlete.cursorX}
              cy={model.selectedAthlete.cursorY}
              r={8}
              fill={selectedStroke}
              opacity={0.16}
            />
            <circle
              cx={model.selectedAthlete.cursorX}
              cy={model.selectedAthlete.cursorY}
              r={4.5}
              fill={selectedStroke}
              stroke="#ffffff"
              strokeWidth={1.8}
            />
            <rect
              x={model.tipPill.x}
              y={model.tipPill.y}
              width={model.tipPill.width}
              height={model.tipPill.height}
              rx={6}
              fill={model.selectedAthlete.you ? c.ink : "#fffbeb"}
              stroke={model.selectedAthlete.you ? "none" : c.podiumGold}
              strokeWidth={model.selectedAthlete.you ? 0 : 1}
            />
            <text
              x={model.tipPill.x + model.tipPill.width / 2}
              y={model.tipPill.y + 13.5}
              textAnchor="middle"
              fill={model.selectedAthlete.you ? c.tennis : c.ink}
              style={typographyStyle("caption")}
            >
              {model.tipPill.text}
            </text>
          </g>
        </svg>
      </div>

      {/* Single-Select Athlete Quick-Focus Chips */}
      {!compact && !immersive && (
        <div
          role="group"
          aria-label="Select athlete trajectory"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            overflowX: "auto",
            paddingTop: 6,
            borderTop: `1px solid ${c.line}`,
          }}
        >
          {model.athletes.map((athlete) => {
            const active = athlete.selected;
            return (
              <button
                key={athlete.id}
                type="button"
                aria-pressed={active}
                aria-label={`Select ${athlete.name}, place ${athlete.placeAtCursor}`}
                onClick={() => handleSelectAthlete(athlete.id)}
                style={{
                  ...typographyStyle("caption"),
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: `1px solid ${
                    active
                      ? athlete.you
                        ? c.ink
                        : c.podiumGold
                      : c.line
                  }`,
                  background: active
                    ? athlete.you
                      ? c.ink
                      : "#fffbeb"
                    : c.paper,
                  color: active
                    ? athlete.you
                      ? "#ffffff"
                      : c.ink
                    : c.ink,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: active
                      ? athlete.you
                        ? c.tennis
                        : "#b45309"
                      : c.muted,
                  }}
                >
                  #{athlete.placeAtCursor}
                </span>
                <strong>{athlete.firstName}</strong>
                <span
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: active
                      ? athlete.you
                        ? "rgba(255, 255, 255, 0.78)"
                        : c.muted
                      : c.muted,
                  }}
                >
                  {athlete.formattedValueAtCursor}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
