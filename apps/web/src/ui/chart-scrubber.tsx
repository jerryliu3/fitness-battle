"use client";

import { SHELL_COLORS as c, chartClientXToModel, nearestChartDatum, type ChartDatum } from "@fitness-battle/shared";
import { useCallback, useId, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { AppText } from "./section";
import { playCue } from "@/lib/haptics";
import "./chart-scrubber.css";

export type { ChartDatum };

const DIRECTION_LOCK_PX = 4;

/** Pointer scrubbing for portfolio and training charts on web. */
export function ChartScrubber({
  points,
  width,
  height,
  plotTop,
  plotBottom,
  children,
  onSelect,
  label,
  summaryOnSelection = false,
  hideSummary = false,
  renderSummary,
  onSelectionChange,
  selectedPointId,
}: {
  points: readonly ChartDatum[];
  width: number;
  height: number;
  plotTop: number;
  plotBottom: number;
  children: ReactNode;
  onSelect?: (id: string) => void;
  label: string;
  summaryOnSelection?: boolean;
  hideSummary?: boolean;
  renderSummary?: (point: ChartDatum | undefined) => ReactNode;
  selectedPointId?: string;
  onSelectionChange?: (point: ChartDatum | undefined) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const lastId = useRef<string | null>(null);
  const scrubbing = useRef(false);
  const pinned = useRef(false);
  const direction = useRef<"horizontal" | "vertical" | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const summaryId = useId();
  const selected = points.find((point) => point.id === (selectedPointId ?? selectedId));
  const latest = useRef({ points, width, onSelect, onSelectionChange });
  latest.current = { points, width, onSelect, onSelectionChange };

  const inspect = useCallback((clientX: number, cue = true) => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    const current = latest.current;
    const modelX = chartClientXToModel(clientX, rect, current.width);
    const point = nearestChartDatum(current.points, modelX);
    if (!point || lastId.current === point.id) return;
    lastId.current = point.id;
    setSelectedId(point.id);
    current.onSelect?.(point.id);
    current.onSelectionChange?.(point);
    if (cue) void playCue("selection");
  }, []);

  function clearSelection() {
    pinned.current = false;
    lastId.current = null;
    setSelectedId(null);
    latest.current.onSelectionChange?.(undefined);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    direction.current = null;
    origin.current = { x: event.clientX, y: event.clientY };
    scrubbing.current = true;
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!scrubbing.current) {
      if (event.pointerType === "mouse" && !pinned.current) inspect(event.clientX, false);
      return;
    }
    if (!direction.current) {
      const dx = event.clientX - origin.current.x;
      const dy = event.clientY - origin.current.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < DIRECTION_LOCK_PX) return;
      direction.current = Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical";
      if (direction.current === "vertical") {
        scrubbing.current = false;
        clearSelection();
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (direction.current === "horizontal") inspect(event.clientX);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (scrubbing.current && direction.current !== "vertical") {
      pinned.current = true;
      inspect(event.clientX);
    }
    scrubbing.current = false;
    direction.current = null;
    lastId.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function moveSelection(step: number) {
    const current = latest.current;
    const index = current.points.findIndex((point) => point.id === (selectedPointId ?? selectedId));
    const next = current.points[
      Math.max(0, Math.min(current.points.length - 1, (index < 0 ? current.points.length - 1 : index) + step))
    ];
    if (!next) return;
    const surface = surfaceRef.current;
    const rect = surface?.getBoundingClientRect();
    const clientX = rect
      ? rect.left + (next.x / current.width) * rect.width
      : next.x;
    lastId.current = null;
    pinned.current = true;
    inspect(clientX);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveSelection(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveSelection(1);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      moveSelection(event.key === "Home" ? -points.length : points.length);
    } else if (event.key === "Escape") {
      event.preventDefault();
      clearSelection();
    }
  }

  return (
    <div className="chart-scrubber">
      {!hideSummary && (
        <div id={summaryId} className="chart-scrubber-summary" aria-live="polite">
          {renderSummary ? renderSummary(selected) : summaryOnSelection ? (
            selected ? (
              <AppText role="caption" secondary>
                {`${selected.label} · ${selected.value}`}
              </AppText>
            ) : null
          ) : (
            <>
              <AppText role="label">{selected?.value ?? points.at(-1)?.value ?? "No data"}</AppText>
              <AppText role="caption" secondary>{selected?.label ?? points.at(-1)?.label ?? ""}</AppText>
            </>
          )}
        </div>
      )}
      <div
        ref={surfaceRef}
        className="chart-scrubber-surface"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-describedby={hideSummary ? undefined : summaryId}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, points.length - 1)}
        aria-valuenow={selected ? Math.max(0, points.findIndex(point => point.id === selected.id)) : Math.max(0, points.length - 1)}
        aria-valuetext={selected ? `${selected.label}, ${selected.value}` : points.at(-1) ? `${points.at(-1)!.label}, ${points.at(-1)!.value}` : "No data"}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { scrubbing.current = false; direction.current = null; clearSelection(); }}
        onPointerLeave={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId) && !pinned.current) clearSelection();
        }}
        onLostPointerCapture={() => { scrubbing.current = false; direction.current = null; }}
      >
        <div className="chart-scrubber-plot" aria-hidden="true">{children}</div>
        {selected && (
          <svg className="chart-scrubber-marker" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
            <line x1={selected.x} x2={selected.x} y1={plotTop} y2={plotBottom} stroke="var(--muted)" strokeWidth={1} />
            <circle cx={selected.x} cy={selected.y} r={4} fill={c.tennis} />
          </svg>
        )}
      </div>
    </div>
  );
}
