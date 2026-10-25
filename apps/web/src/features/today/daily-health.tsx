"use client";

import { useState, type CSSProperties } from "react";
import { HOME_HEALTH_COLORS as colors, HOME_HEALTH_ICON_PATHS, healthSparkline, homeHealthMetrics, type CompeteState } from "@fitness-battle/shared";
import { AppHeading } from "@/ui/section";
import "./daily-health.css";

const palette = Object.fromEntries(Object.entries(colors).map(([key, value]) => [`--health-${key}`, value])) as CSSProperties;
export function DailyHealth({ state }: { state: CompeteState }) {
  const metrics = homeHealthMetrics(state);
  const [expanded, setExpanded] = useState<string | null>(null);
  const selected = metrics.find(metric => metric.id === expanded);
  return <section className="home-health" style={palette} aria-label="Today's health">
    <div className="home-health-title"><AppHeading level={2} role="heading" style={{ color: colors.text }}>Today’s health</AppHeading><span>Daily signals</span></div>
    <div className="home-health-grid">{metrics.map((metric, index) => {
      const spark = healthSparkline(metric.history);
      return <button type="button" key={metric.id} className="home-health-tile" aria-expanded={expanded === metric.id} onClick={() => setExpanded(expanded === metric.id ? null : metric.id)}>
        <span className="home-health-name">{metric.name}</span>
        <svg className="home-health-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={HOME_HEALTH_ICON_PATHS[metric.id]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <strong>{metric.value}</strong><span className="home-health-context">{metric.context}</span>
        {spark.dots.length > 0 && <svg className="home-health-spark" viewBox="0 0 80 36" aria-hidden="true" style={{ color: index % 2 ? colors.sage : colors.gold }}>
          {spark.segments.map((points, i) => <polyline key={i} points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>)}
          {spark.dots.map((dot, i) => <circle key={i} cx={dot.x} cy={dot.y} r="2" fill="currentColor"/>)}
        </svg>}
      </button>;
    })}</div>
    {selected && <div className="home-health-detail" role="status"><b>{selected.name}</b><p>{selected.detail}</p>{selected.history.some(value => value != null) && <span>Mini chart: recorded duration over the last seven wake dates. Gaps mean no reading.</span>}</div>}
    <p className="home-health-note">Recorded readings only. Steps, resting HR and HRV aren’t connected yet.</p>
  </section>;
}
