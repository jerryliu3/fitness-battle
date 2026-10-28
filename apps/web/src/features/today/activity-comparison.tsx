"use client";

import { useState } from "react";
import { activityComparisons, competeNow, type Activity, type CompeteState } from "@fitness-battle/shared";
import { AppHeading } from "@/ui/section";

export function ActivityComparison({ activity, state, compact = false }: { activity: Activity; state: CompeteState; compact?: boolean }) {
  const comparisons = activityComparisons(activity, state.activities, state.units, competeNow(state));
  const [selected, setSelected] = useState<string>("time");
  if (!comparisons.length) return null;
  if (compact) return <section className="activity-comparison" aria-label="Compared with your usual">
    <AppHeading>Compared with your usual</AppHeading>
    {comparisons.map(item => <div key={item.id} className="ac-quick-stat"><b>{item.label}</b><strong>{item.currentLabel}</strong><small>{item.id === "frequency" ? "Previous 30 days" : "Previous median"} · {item.baselineLabel}</small><small>{item.context}</small></div>)}
  </section>;
  const metric = comparisons.find(item => item.id === selected) ?? comparisons[0]!;
  const max = Math.max(metric.current, metric.baseline);
  return <section className="activity-comparison" aria-label="This session in context">
    <AppHeading>This session in context</AppHeading>
    <p>Compare with your own {activity.sport} history</p>
    <div className="activity-comparison-choices" aria-label="Comparison metric">
      {comparisons.map(item => <button type="button" key={item.id} aria-pressed={item.id === metric.id} onClick={() => setSelected(item.id)}>{item.label}</button>)}
    </div>
    <div className="activity-comparison-chart" aria-live="polite">
      {[[metric.id === "frequency" ? "Last 30 days" : "This session", metric.currentLabel, metric.current, true], [metric.id === "frequency" ? "Previous 30 days" : "Median", metric.baselineLabel, metric.baseline, false]].map(([label, value, amount, current]) => <div className="activity-comparison-row" key={String(label)}>
        <div><span>{label}</span><strong>{value}</strong></div>
        <div className="activity-comparison-track" aria-hidden="true"><div className={current ? "is-current" : "is-previous"} style={{ width: `${max ? Number(amount) / max * 100 : 0}%` }}/></div>
      </div>)}
    </div>
    <p>{metric.context}</p>
  </section>;
}
