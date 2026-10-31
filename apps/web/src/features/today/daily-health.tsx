"use client";

import { Fragment, useState, type CSSProperties } from "react";
import {
  HOME_HEALTH_COLORS as colors,
  buildHealth7DayCorridorModel,
  competeNow,
  healthSignal,
  healthSignalRange,
  homeHealthMetrics,
  type CompeteState,
} from "@fitness-battle/shared";
import { AppHeading } from "@/ui/section";
import "./daily-health.css";

const palette = Object.fromEntries(
  Object.entries(colors).map(([key, value]) => [`--health-${key}`, value]),
) as CSSProperties;

export function DailyHealth({ state }: { state: CompeteState }) {
  const metrics = homeHealthMetrics(state);
  const [expanded, setExpanded] = useState<string | null>(null);
  const selected = metrics.find((metric) => metric.id === expanded);

  return (
    <section className="home-health" style={palette} aria-label="Today's health">
      <div className="home-health-title">
        <AppHeading level={2} role="heading" style={{ color: colors.text }}>
          Today’s health
        </AppHeading>
      </div>
      <div className="home-health-grid">
        {metrics.map((metric, index) => {
          const signal = healthSignal(metric.history);
          const isRowEnd = index % 2 === 1 || index === metrics.length - 1;
          const rowStart = index - (index % 2);
          const isSelectedInRow =
            selected && metrics.slice(rowStart, index + 1).some((item) => item.id === selected.id);

          return (
            <Fragment key={metric.id}>
              <button
                type="button"
                className="home-health-tile"
                aria-label={`${metric.name}, ${metric.value}${metric.unit ? ` ${metric.unit}` : ""}, ${metric.context}`}
                aria-expanded={expanded === metric.id}
                aria-controls={expanded === metric.id ? "home-health-detail" : undefined}
                onClick={() => setExpanded(expanded === metric.id ? null : metric.id)}
              >
                <span className="home-health-name">{metric.name}</span>
                <div className="home-health-signal">
                  <svg viewBox="0 0 144 144" aria-hidden="true">
                    <path d={signal.track} fill="none" stroke={colors.border} strokeWidth="7" strokeLinecap="round" />
                    {signal.ticks.map((tick, i) => (
                      <line
                        key={i}
                        x1={tick.outer.x}
                        y1={tick.outer.y}
                        x2={tick.inner.x}
                        y2={tick.inner.y}
                        stroke={colors.comparison}
                      />
                    ))}
                    {signal.fill && (
                      <path d={signal.fill} fill="none" stroke={colors.accent} strokeWidth="7" strokeLinecap="round" />
                    )}
                  </svg>
                  <span className="home-health-reading">
                    <strong>{metric.value}</strong>
                    {metric.unit && <span>{metric.unit}</span>}
                  </span>
                </div>
                <span className="home-health-context">{healthSignalRange(metric)}</span>
              </button>

              {isRowEnd && isSelectedInRow && selected && (() => {
                const chart = buildHealth7DayCorridorModel(selected, competeNow(state));
                return (
                  <div
                    id="home-health-detail"
                    className="home-health-detail"
                    role="region"
                    aria-label={`${selected.name} 7-day corridor chart`}
                  >
                    <div className="home-health-chart-header">
                      <div className="home-health-chart-title">
                        <b>{selected.name}</b>
                        <span className="home-health-chart-corridor">
                          Baseline corridor: {chart.formattedRange}
                        </span>
                      </div>
                      {chart.hasUnder && (
                        <span className="home-health-chart-alert">Below corridor</span>
                      )}
                    </div>
                    <div className="home-health-chart-body">
                      <svg
                        viewBox={`0 0 ${chart.width} ${chart.height}`}
                        className="home-health-chart-svg"
                        aria-label={`${selected.name} 7-day corridor chart`}
                      >
                        {chart.hasBaseline && <g><path d={chart.corridorAreaPath} fill="var(--health-accent)" opacity="0.12" />
                        <line
                          x1={38}
                          x2={304}
                          y1={chart.corridorYTop}
                          y2={chart.corridorYTop}
                          stroke="var(--health-accent)"
                          strokeDasharray="3 3"
                          opacity="0.65"
                        />
                        <line
                          x1={38}
                          x2={304}
                          y1={chart.corridorYBottom}
                          y2={chart.corridorYBottom}
                          stroke="var(--health-accent)"
                          strokeDasharray="3 3"
                          opacity="0.65"
                        />
                        <text
                          x={34}
                          y={chart.corridorYTop + 3}
                          textAnchor="end"
                          className="home-health-axis-label"
                        >
                          {chart.baselineHigh}
                        </text>
                        <text
                          x={34}
                          y={chart.corridorYBottom + 3}
                          textAnchor="end"
                          className="home-health-axis-label"
                        >
                          {chart.baselineLow}
                        </text>
                        </g>}
{chart.lineSegments.map((d, i) => (
                          <path
                            key={i}
                            d={d}
                            fill="none"
                            stroke="var(--health-accent)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ))}
                        {chart.points.map((p) => {
                          if (p.value == null || p.y == null) {
                            return (
                              <circle
                                key={p.index}
                                cx={p.x}
                                cy={60}
                                r={3}
                                fill="none"
                                stroke="var(--health-border)"
                                strokeDasharray="2 2"
                              />
                            );
                          }
                          const isUnder = p.position === "under";
                          const ptColor = isUnder ? "var(--health-comparison)" : "var(--health-accent)";
                          return (
                            <g key={p.index}>
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={p.index === 6 ? 4.5 : 3.5}
                                fill={ptColor}
                                stroke="var(--health-tile)"
                                strokeWidth="1.5"
                              />
                              <text
                                x={p.x}
                                y={Math.max(12, p.y - 7)}
                                textAnchor="middle"
                                className={isUnder ? "home-health-pt-under" : "home-health-pt-value"}
                              >
                                {p.formatted}
                              </text>
                            </g>
                          );
                        })}
                        {chart.points.map((p) => (
                          <text
                            key={`l-${p.index}`}
                            x={p.x}
                            y={chart.height - 4}
                            textAnchor="middle"
                            className={p.index === 6 ? "home-health-day-label-active" : "home-health-day-label"}
                          >
                            {p.dayLabel}
                          </text>
                        ))}
                      </svg>
                    </div>
                  </div>
                );
              })()}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
