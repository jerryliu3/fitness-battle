"use client";

import { Fragment, useState, type CSSProperties } from "react";
import { HOME_HEALTH_COLORS as colors, healthSignal, healthSignalRange, homeHealthMetrics, type CompeteState } from "@fitness-battle/shared";
import { AppHeading } from "@/ui/section";
import "./daily-health.css";

const palette = Object.fromEntries(Object.entries(colors).map(([key, value]) => [`--health-${key}`, value])) as CSSProperties;
export function DailyHealth({ state }: { state: CompeteState }) {
  const metrics = homeHealthMetrics(state);
  const [expanded, setExpanded] = useState<string | null>(null);
  const selected = metrics.find(metric => metric.id === expanded);
  return <section className="home-health" style={palette} aria-label="Today's health">
    <div className="home-health-title"><AppHeading level={2} role="heading" style={{ color: colors.text }}>Today’s health</AppHeading></div>
    <div className="home-health-grid">{metrics.map((metric, index) => {
      const signal = healthSignal(metric.history);
      return <Fragment key={metric.id}><button type="button" className="home-health-tile" aria-label={`${metric.name}, ${metric.value}${metric.unit ? ` ${metric.unit}` : ""}, ${metric.context}`} aria-expanded={expanded === metric.id} aria-controls={expanded === metric.id ? "home-health-detail" : undefined} onClick={() => setExpanded(expanded === metric.id ? null : metric.id)}>
        <span className="home-health-name">{metric.name}</span>
        <div className="home-health-signal">
          <svg viewBox="0 0 144 144" aria-hidden="true">
            <path d={signal.track} fill="none" stroke={colors.border} strokeWidth="7" strokeLinecap="round"/>
            {signal.ticks.map((tick, i) => <line key={i} x1={tick.outer.x} y1={tick.outer.y} x2={tick.inner.x} y2={tick.inner.y} stroke={colors.comparison}/>) }
            {signal.fill && <path d={signal.fill} fill="none" stroke={colors.accent} strokeWidth="7" strokeLinecap="round"/>}
          </svg>
          <span className="home-health-reading"><strong>{metric.value}</strong>{metric.unit && <span>{metric.unit}</span>}</span>
        </div>
        <span className="home-health-context">{healthSignalRange(metric)}</span>
      </button>
      {index % 2 === 1 && selected && metrics.slice(index - 1, index + 1).some(item => item.id === selected.id) && (
        <div id="home-health-detail" className="home-health-detail" role="status">
          <b>{selected.name}</b><p>{selected.detail}</p>
          {selected.history.some(value => value != null) && <span>The ring fills from zero to today’s reading. Its scale ends at the highest recorded reading in the last seven wake dates; it is not a goal.</span>}
        </div>
      )}</Fragment>;
    })}</div>
  </section>;
}
