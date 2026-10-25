"use client";

import { nearestChartDatum, type ChartDatum } from "@fitness-battle/shared";
import { useCallback, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { AppText } from "./section";
import { playCue } from "@/lib/haptics";
import "./chart-scrubber.css";

export type { ChartDatum };

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
  const measuredWidth = useRef(1);
  const lastId = useRef<string | null>(null);
  const scrubbing = useRef(false);
  const selected = points.find((point) => point.id === selectedId);
  const latest = useRef({ points, width, onSelect });
  latest.current = { points, width, onSelect };

  const inspect = useCallback((clientX: number, left: number) => {
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
    scrubbing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    inspect(event.clientX, event.currentTarget.getBoundingClientRect().left);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!scrubbing.current) return;
    inspect(event.clientX, event.currentTarget.getBoundingClientRect().left);
  }

  function onPointerUp() {
    scrubbing.current = false;
    lastId.current = null;
  }

  const summary = selected
    ? `${selected.label} · ${selected.value}`
    : points.at(-1)
      ? `${points.at(-1)!.label} · ${points.at(-1)!.value}`
      : "Slide across the chart to inspect";

  return (
    <div className="chart-scrubber">
      <div className="chart-scrubber-summary" aria-live="polite">
        {summaryOnSelection ? (
          <AppText role="caption" secondary>{selected ? summary : "Slide across the chart to inspect"}</AppText>
        ) : (
          <>
            <AppText role="label">{selected?.value ?? points.at(-1)?.value ?? "No data"}</AppText>
            <AppText role="caption" secondary>{selected?.label ?? points.at(-1)?.label ?? ""}</AppText>
          </>
        )}
      </div>
      <div
        className="chart-scrubber-surface"
        role="img"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
        ref={(node) => {
          if (node) measuredWidth.current = Math.max(1, node.getBoundingClientRect().width);
        }}
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
