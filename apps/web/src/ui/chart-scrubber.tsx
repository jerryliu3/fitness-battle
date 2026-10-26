"use client";

import { nearestChartDatum, type ChartDatum } from "@fitness-battle/shared";
import { useCallback, useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
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
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const measuredWidth = useRef(1);
  const lastId = useRef<string | null>(null);
  const scrubbing = useRef(false);
  const direction = useRef<"horizontal" | "vertical" | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const selected = points.find((point) => point.id === selectedId);
  const latest = useRef({ points, width, onSelect });
  latest.current = { points, width, onSelect };

  useEffect(() => {
    const node = surfaceRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      measuredWidth.current = Math.max(1, node.getBoundingClientRect().width);
    });
    observer.observe(node);
    measuredWidth.current = Math.max(1, node.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const inspect = useCallback((clientX: number) => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const left = surface.getBoundingClientRect().left;
    const current = latest.current;
    const x = Math.max(0, Math.min(measuredWidth.current, clientX - left));
    const point = nearestChartDatum(current.points, (x / measuredWidth.current) * current.width);
    if (!point || lastId.current === point.id) return;
    lastId.current = point.id;
    setSelectedId(point.id);
    current.onSelect?.(point.id);
    void playCue("selection");
  }, []);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    direction.current = null;
    origin.current = { x: event.clientX, y: event.clientY };
    scrubbing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    inspect(event.clientX);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!scrubbing.current) return;
    if (!direction.current) {
      const dx = event.clientX - origin.current.x;
      const dy = event.clientY - origin.current.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < DIRECTION_LOCK_PX) return;
      direction.current = Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical";
      if (direction.current === "vertical") {
        scrubbing.current = false;
        lastId.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
        return;
      }
    }
    if (direction.current === "horizontal") inspect(event.clientX);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    scrubbing.current = false;
    direction.current = null;
    lastId.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="chart-scrubber">
      <div className="chart-scrubber-summary" aria-live="polite">
        {summaryOnSelection ? (
          <AppText role="caption" secondary>
            {selected ? `${selected.label} · ${selected.value}` : "Slide across the chart to inspect"}
          </AppText>
        ) : (
          <>
            <AppText role="label">{selected?.value ?? points.at(-1)?.value ?? "No data"}</AppText>
            <AppText role="caption" secondary>{selected?.label ?? points.at(-1)?.label ?? ""}</AppText>
          </>
        )}
      </div>
      <div
        ref={surfaceRef}
        className="chart-scrubber-surface"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
      >
        <div className="chart-scrubber-plot" aria-hidden="true">{children}</div>
        {selected && (
          <svg className="chart-scrubber-marker" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
            <line x1={selected.x} x2={selected.x} y1={plotTop} y2={plotBottom} stroke="var(--ink)" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={selected.x} cy={selected.y} r={4} fill="var(--ink)" stroke="var(--card)" strokeWidth={2} />
          </svg>
        )}
      </div>
    </div>
  );
}
