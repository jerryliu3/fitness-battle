"use client";
import { buildCompetitionMomentTimeSeriesModel, type CompetitionMoment } from "@fitness-battle/shared";

import { useEffect, useMemo, useRef, useState } from "react";
import { colors as c } from "@/theme/app-colors";
import { useAppearance } from "@/theme/appearance-provider";
import {
  APP_ICON_PATHS,
  competeChartPreview,
  competeTimeSeriesPathColor,
  buildCompeteTimeSeriesModel,
  buildSleepTimeSeriesModel,
  clamp,
  competeNow,
  freshState,
  sportById,
  type CompeteState,
  type CompeteTimeSeriesModel,
  type CompeteTimeSeriesView,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { playCue } from "@/lib/haptics";
import { typographyStyle } from "@/ui/section";
import { UserAvatar } from "@/ui/user-avatar";
import { AthleteNode } from "./athlete-node";

const GRAPH_VIEWS: readonly { id: CompeteTimeSeriesView; label: string; icon: "progress" | "scoring" }[] = [
  { id: "trajectory", label: "Trajectory", icon: "progress" },
  { id: "event", label: "Event", icon: "scoring" },
];

export function GraphOptions() {
  const { preference, setPreference } = useAppearance();
  const [open, setOpen] = useState(false);
  const [systemDark, setSystemDark] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemDark(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const dark = preference === "dark" || (preference === "system" && systemDark);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="club-icon-button"
        aria-label="Graph options"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d={APP_ICON_PATHS.layers} />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Graph options menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 200,
            padding: 12,
            borderRadius: 14,
            background: c.card,
            border: `1px solid ${c.line}`,
            boxShadow: "0 10px 28px rgba(0, 0, 0, 0.16)",
            zIndex: 30,
          }}
        >
          <label
            style={{
              ...typographyStyle("label"),
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              minHeight: 36,
              color: c.ink,
              cursor: "pointer",
            }}
          >
            <span>Dark mode</span>
            <input
              type="checkbox"
              role="switch"
              aria-label="Dark mode"
              checked={dark}
              onChange={() => {
                void playCue("selection");
                setPreference(dark ? "light" : "dark");
              }}
              style={{ width: 18, height: 18, accentColor: c.podiumGold, cursor: "pointer" }}
            />
          </label>
        </div>
      )}
    </div>
  );
}

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
  view,
  onViewChange,
  timelineFraction,
  onTimelineChange,
  momentReplay,
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
  view?: CompeteTimeSeriesView;
  onViewChange?: (view: CompeteTimeSeriesView) => void;
  timelineFraction?: number | null;
  onTimelineChange?: (value: number | null) => void;
  momentReplay?: { moment: CompetitionMoment; progress: number };
}) {
  const container = useRef<HTMLDivElement>(null);
  const [plotHeight, setPlotHeight] = useState(204);
  useEffect(() => {
    const resize = () => setPlotHeight(immersive ? Math.max(140, (container.current?.clientHeight || window.innerHeight) - 380) : 204);
    resize();
    window.addEventListener("resize", resize);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    if (container.current) observer?.observe(container.current);
    return () => { window.removeEventListener("resize", resize); observer?.disconnect(); };
  }, [immersive]);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    null,
  );
  const [popupOpen, setPopupOpen] = useState(false);
  const [internalView, setInternalView] = useState<CompeteTimeSeriesView>("trajectory");
  const activeView = view ?? internalView;
  const setActiveView = onViewChange ?? setInternalView;
  const [internalFraction, setInternalFraction] = useState<number | null>(null);
  const scrubFraction = timelineFraction !== undefined ? timelineFraction : internalFraction;
  const setScrubFraction = onTimelineChange ?? setInternalFraction;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const lastBucketRef = useRef<number | null>(null);

  const activeSelectedId =
    selectedId !== undefined ? selectedId : internalSelectedId;

  const effectiveNow = now ?? (state ? competeNow(state) : new Date());
  const model: CompeteTimeSeriesModel = useMemo(() => {
    if (momentReplay) return buildCompetitionMomentTimeSeriesModel(momentReplay.moment, momentReplay.progress, {
      height: plotHeight, hiddenIds, selectedAthleteId: activeSelectedId,
    });
    const safeState = state ?? freshState(effectiveNow);
    const viewOption = compact ? undefined : activeView;
    if (mode === "sleep") {
      return buildSleepTimeSeriesModel(safeState, effectiveNow, {
        height: plotHeight,
        hiddenIds,
        selectedAthleteId: activeSelectedId,
        scrubFraction,
        view: viewOption,
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
        view: viewOption,
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
    activeView,
    compact,
    effectiveNow.getTime(),
    momentReplay,
  ]);

  const handleSelectAthlete = (id: string) => {
    void playCue("selection");
    if (model.selectedAthlete.id === id) {
      setPopupOpen((open) => !open);
    } else {
      setPopupOpen(false);
    }
    if (selectedId === undefined) {
      setInternalSelectedId(id);
    }
    onSelectAthlete?.(id);
  };

  const updateScrubFromClientX = (clientX: number) => {
    if (!model.historyAvailable) return;
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

  const selectedLeads = model.selectedAthlete.placeAtCursor === 1;

  if (compact) {
    const preview = competeChartPreview(model);
    return <svg aria-label="Current race position over the past day" role="img" viewBox={`0 0 ${preview.width} ${preview.height}`} style={{ display: "block", width: "100%", height: "100%", overflow: "hidden" }}>
      <rect width={preview.width} height={preview.height} fill={c.accentSecondarySoft} />
      <text style={typographyStyle("caption")} x={preview.left} y={16} fill={c.muted}>{model.unit}</text>
      {preview.yTicks.map(tick => <g key={tick.y}><line x1={preview.left} x2={preview.right} y1={tick.y} y2={tick.y} stroke={c.line} /><text style={typographyStyle("caption")} x={preview.left - 8} y={tick.y + 4} textAnchor="end" fill={c.muted}>{tick.label}</text></g>)}
      {preview.xTicks.map((tick, i) => <text style={typographyStyle("caption")} key={tick.label} x={tick.x} y={282} textAnchor={i ? "end" : "start"} fill={c.muted}>{tick.label}</text>)}
      {preview.athletes.map(athlete => <g key={athlete.id}>
        <polyline points={athlete.points} fill="none" stroke={competeTimeSeriesPathColor(athlete.placeAtCursor)} strokeWidth={athlete.selected ? 4 : 2} opacity={athlete.selected ? 1 : .9} />
        <g transform={`translate(${athlete.x} ${athlete.y})`}>
          <AthleteNode
            lane={athlete}
            x={0}
            y={0}
            detail=""
            prefix={`preview-${athlete.id}`}
            expanded={false}
            selected={athlete.id === activeSelectedId}
            gold={athlete.placeAtCursor === 1}
            nodeRadius={22}
          />
        </g>
      </g>)}
    </svg>;
  }

  const cleanGapLabel = model.gapLabel
    .replace(/^Tied with .+$/i, "Tied")
    .replace(/(\s+to\s+#\d+)\s+.+$/i, "$1")
    .replace(/\s+vs\s+.+$/i, "");

  return (
    <div
      ref={container}
      aria-label="Weekly competition time-series graph"
      style={{
        background: immersive ? c.paper : c.card,
        borderRadius: immersive ? 0 : 20,
        border: immersive ? "none" : `1px solid ${c.line}`,
        height: immersive ? "100%" : undefined,
        boxSizing: "border-box",
        padding: 16,
        paddingTop: immersive ? "calc(env(safe-area-inset-top, 0px) + 64px)" : reserveTopControls ? 64 : 16,
        paddingBottom: immersive ? "calc(env(safe-area-inset-bottom, 0px) + 136px)" : 16,
        display: "grid",
        alignContent: immersive ? "space-between" : undefined,
        gap: 10,
        color: c.ink,
      }}
    >
      {/* Pure Open Line Header */}
      {immersive ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 4px",
          }}
        >
          <UserAvatar
            src={model.selectedAthlete.avatarUrl}
            name={model.selectedAthlete.name}
            size={56}
            highlight={model.selectedAthlete.you}
          />
          <div style={{ display: "grid", gap: 2, minWidth: 0, flex: 1 }}>
            <strong
              style={{
                ...typographyStyle("heading"),
                color: c.ink,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {model.selectedAthlete.name}
            </strong>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  ...typographyStyle("label"),
                  color: selectedLeads ? c.podiumGold : c.ink,
                }}
              >
                {model.placeLabel}
              </span>
              <span style={{ ...typographyStyle("label"), color: c.muted }}>·</span>
              <span
                style={{
                  ...typographyStyle("label"),
                  color: c.muted,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {`${model.selectedAthlete.formattedValueAtCursor} ${model.unit}`}
              </span>
            </div>
          </div>
        </div>
      ) : (
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
                  background: selectedLeads ? c.actionHighlight : c.soft,
                  color: c.ink,
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
              {cleanGapLabel}
            </strong>
            {model.historyAvailable && <span
              style={{
                ...typographyStyle("caption"),
                color: model.overtakeCount > 0 ? c.fieldTeal : c.muted,
              }}
            >
              {model.overtakeLabel}
            </span>}
          </div>
        </div>
      )}

      {/* Time-Series SVG Plot */}
      <div
        style={{
          position: "relative",
          width: "100%",
          touchAction: "pan-y",
          userSelect: "none",
          pointerEvents: "auto",
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
            cursor: model.historyAvailable ? "ew-resize" : "default",
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

          {/* Active time cursor line (visible when scrubbing) */}
          {model.isScrubbing && (
            <line
              x1={model.cursorX}
              x2={model.cursorX}
              y1={model.top - 4}
              y2={model.bottom}
              stroke={c.ink}
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.45}
            />
          )}

          {model.athletes.map((athlete) => (
            <polyline
              key={`path-${athlete.id}`}
              points={athlete.polyline}
              fill="none"
              stroke={competeTimeSeriesPathColor(athlete.placeAtCursor)}
              strokeWidth={athlete.selected ? 3 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={athlete.selected ? 1 : 0.92}
            />
          ))}

          {model.athletes.filter((athlete) => !athlete.selected).map((athlete) => (
            <g
              key={athlete.id}
              style={{ cursor: "pointer" }}
              onClick={(event) => {
                event.stopPropagation();
                handleSelectAthlete(athlete.id);
              }}
              transform={`translate(${athlete.cursorX} ${athlete.cursorY})`}
            >
              <AthleteNode
                lane={athlete}
                x={0}
                y={0}
                detail=""
                prefix={`ts-peer-${athlete.id}`}
                expanded={false}
                selected={false}
                gold={athlete.placeAtCursor === 1}
                nodeRadius={22}
              />
            </g>
          ))}

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
              <circle cx={node.x} cy={node.y} r={1.8} fill={c.textOnAction} />
            </g>
          ))}

          {/* Selected Athlete Live/Cursor Circular Profile Node + Expandable Detail Popup */}
          <g
            transform={`translate(${model.selectedAthlete.cursorX} ${model.selectedAthlete.cursorY})`}
            style={{ cursor: "pointer" }}
            onClick={(event) => {
              event.stopPropagation();
              handleSelectAthlete(model.selectedAthlete.id);
            }}
          >
            <AthleteNode
              lane={{
                name: model.selectedAthlete.name,
                initials: model.selectedAthlete.initials,
                you: model.selectedAthlete.you,
                avatarUrl: model.selectedAthlete.avatarUrl,
              }}
              x={clamp(
                model.left - model.selectedAthlete.cursorX + 4,
                model.width - 132 - model.selectedAthlete.cursorX,
                model.selectedAthlete.cursorX > 180 ? -144 : 20,
              )}
              y={clamp(
                model.top - model.selectedAthlete.cursorY - 8,
                model.bottom - 48 - model.selectedAthlete.cursorY + 8,
                model.selectedAthlete.cursorY > model.top + 56 ? -56 : 20,
              )}
              detail={`${model.placeLabel} · ${model.selectedAthlete.formattedValueAtCursor} ${model.unit}`}
              subdetail={cleanGapLabel}
              prefix={`athlete-${model.selectedAthlete.id}`}
              expanded={popupOpen}
              selected={model.selectedAthlete.id === activeSelectedId}
              gold={selectedLeads}
              nodeRadius={22}
            />
          </g>
        </svg>
      </div>

      {/* Graph View Switcher: Trajectory vs Event */}
      <div
        role="tablist"
        aria-label="Graph view"
        style={{
          justifySelf: "center",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: 4,
          borderRadius: 999,
          background: c.card,
          border: `1px solid ${c.line}`,
        }}
      >
        {GRAPH_VIEWS.map((option) => {
          const selected = activeView === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={`${option.label} graph view`}
              onClick={() => {
                if (selected) return;
                void playCue("selection");
                setActiveView(option.id);
              }}
              style={{
                ...typographyStyle("label"),
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                minHeight: 36,
                padding: "0 16px",
                borderRadius: 999,
                border: `1px solid ${
                  selected
                    ? "light-dark(var(--app-border-subtle), var(--app-podium-gold))"
                    : "transparent"
                }`,
                background: selected
                  ? "light-dark(var(--app-accent-secondary-soft), var(--app-action-soft))"
                  : "transparent",
                color: selected ? c.ink : c.muted,
                cursor: "pointer",
              }}
            >
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d={APP_ICON_PATHS[option.icon]} />
              </svg>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      {/* Single-Select Athlete Quick-Focus Chips */}
      {!immersive && (
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
                      ? c.surfaceInverse
                      : c.actionSoft
                    : c.paper,
                  color: active
                    ? athlete.you
                      ? c.textOnInverse
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
                        ? c.textOnInverse
                        : c.ink
                      : c.muted,
                  }}
                >
                  #{athlete.placeAtCursor}
                </span>
                <strong>{athlete.initials}</strong>
                <span
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: active
                      ? athlete.you
                        ? c.textOnInverse
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
