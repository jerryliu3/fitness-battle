"use client";

import { useMemo, type ReactElement } from "react";
import {
  SHELL_COLORS as c,
  buildStandardChartGeometry,
} from "@fitness-battle/shared";
import { ChartSvg, ChartText } from "./chart-text";

export interface StandardLineChartProps {
  values: number[];
  xLabels?: [string, string, string]; // [start, mid, end]
  formatY?: (value: number) => string;
  selectedIdx?: number;
  onSelectIdx?: (index: number) => void;
  stroke?: string;
  height?: number;
  corridor?: {
    high: number[];
    low: number[];
  };
  ariaLabel?: string;
  accessibilityLabel?: string;
}

export function StandardLineChart({
  values,
  xLabels,
  formatY = (v) => `${Math.round(v)}`,
  selectedIdx,
  onSelectIdx,
  stroke = c.fieldTeal,
  height = 150,
  corridor,
  ariaLabel,
  accessibilityLabel,
}: StandardLineChartProps): ReactElement | null {
  const geo = useMemo(
    () => buildStandardChartGeometry(values, 340, height, corridor),
    [values, height, corridor],
  );

  if (values.length < 2) return null;

  const activeIdx =
    selectedIdx !== undefined && selectedIdx >= 0 && selectedIdx < geo.points.length
      ? selectedIdx
      : undefined;
  const activePt = activeIdx !== undefined ? geo.points[activeIdx] : undefined;

  return (
    <div
      style={{
        width: "100%",
        height,
        position: "relative",
        margin: "10px 0",
      }}
    >
      <ChartSvg
        width="100%"
        height={height}
        viewBox={`0 0 340 ${height}`}
        style={{ overflow: "visible" }}
        role="img"
        aria-label={ariaLabel ?? accessibilityLabel}
      >
        {/* Horizontal gridlines */}
        {[
          [geo.yTop, geo.yMax],
          [geo.yMidPos, geo.yMid],
          [geo.yBottom, geo.yMin],
        ].map(([y, val]) => (
          <g key={y}>
            <line
              x1={geo.xStart}
              x2={geo.xEnd}
              y1={y}
              y2={y}
              stroke={c.line}
              strokeDasharray="3 3"
            />
            <ChartText
              x={geo.xStart - 8}
              y={y + 3}
              textAnchor="end"
              fill={c.muted}
            >
              {formatY(val)}
            </ChartText>
          </g>
        ))}

        {/* Vertical baseline */}
        <line
          x1={geo.xStart}
          x2={geo.xStart}
          y1={geo.yTop}
          y2={geo.yBottom}
          stroke={c.line}
        />

        {/* Corridor fill */}
        {geo.corridorPath && (
          <path d={geo.corridorPath} fill={stroke} opacity={0.16} />
        )}

        {/* Area fill */}
        <path d={geo.areaPath} fill={stroke} opacity={0.12} />

        {/* Main trend line */}
        <polyline
          points={geo.polyline}
          fill="none"
          stroke={stroke}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data point dots */}
        {geo.points.map((p, i) => (
          <circle
            key={`dot-${i}`}
            cx={p.x}
            cy={p.y}
            r={i === activeIdx ? 5 : 2.5}
            fill={i === activeIdx ? stroke : c.card}
            stroke={stroke}
            strokeWidth={2}
          />
        ))}

        {/* Active cursor / crosshair */}
        {activePt && (
          <line
            x1={activePt.x}
            x2={activePt.x}
            y1={geo.yTop}
            y2={geo.yBottom}
            stroke={c.line}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {/* X-axis date labels */}
        {xLabels && (
          <>
            <ChartText
              x={geo.xStart}
              y={height - 8}
              textAnchor="start"
              fill={c.muted}
            >
              {xLabels[0]}
            </ChartText>
            {xLabels[1] && (
              <ChartText
                minChartWidth={260}
                x={geo.xMid}
                y={height - 8}
                textAnchor="middle"
                fill={c.muted}
              >
                {xLabels[1]}
              </ChartText>
            )}
            <ChartText
              x={geo.xEnd}
              y={height - 8}
              textAnchor="end"
              fill={c.muted}
            >
              {xLabels[2]}
            </ChartText>
          </>
        )}

        {/* Transparent tap / click columns */}
        {onSelectIdx &&
          geo.points.map((p, i) => (
            <rect
              key={`col-${i}`}
              x={p.x - (geo.xEnd - geo.xStart) / (values.length * 2)}
              y={geo.yTop}
              width={(geo.xEnd - geo.xStart) / values.length}
              height={geo.yBottom - geo.yTop}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onClick={() => onSelectIdx(i)}
            />
          ))}
      </ChartSvg>
    </div>
  );
}
