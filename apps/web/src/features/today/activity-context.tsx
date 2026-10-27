"use client";

import { AppHeading } from "@/ui/section";
import { useState, type ReactNode } from "react";
import {
  competeNow, sportById, activityContextConstellation as constellation,
  activityContextDateLabel as dateLabel, activityContextFitHistory as fitHistory,
  activityContextFormatMetric as formatMetric, activityContextMetricValue as metricValue,
  activityContextSessionHistory as sessionHistory, activityContextTrajectory as trajectory,
  activityContextVolumeHistory as volumeHistory, activityContextEfficiencyBaseline as efficiencyBaseline,
  type Activity, type CompeteState, type UnitSystem, type ActivityContextMetric as Metric,
} from "@fitness-battle/shared";

type Point = { id: string; x: number; y: number };
const W = 360, H = 258, L = 48, R = 344, T = 18, B = 212;
const extent = (values: number[], padding = 1): [number, number] => {
  const low = Math.min(...values), high = Math.max(...values), pad = Math.max(padding, (high - low) * .16);
  return [low - pad, high + pad];
};
const scale = (domain: [number, number], a: number, b: number) => (value: number) => a + (value - domain[0]) / (domain[1] - domain[0] || 1) * (b - a);
const path = (points: { x: number; y: number }[]) => points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
const ink = "var(--ink)", teal = "var(--field-teal)", yellow = "var(--action-primary)", muted = "var(--muted)", line = "var(--line)";

function Choices<T extends string>({ items, value, onChange, label }: { items: { id: T; label: string }[]; value: T; onChange: (id: T) => void; label: string }) {
  return <div className="ac-choices" role="group" aria-label={label}>{items.map(item => <button type="button" key={item.id} aria-pressed={value === item.id} onClick={() => onChange(item.id)}>{item.label}</button>)}</div>;
}
function Readout({ title, value, detail }: { title: string; value: string; detail?: string }) {
  return <div className="ac-readout" aria-live="polite"><span>{title}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}
function Plot({ points, selected, onSelect, label, children }: { points: Point[]; selected: string; onSelect: (id: string) => void; label: string; children: ReactNode }) {
  return <svg className="ac-plot" viewBox={`0 0 ${W} ${H}`} role="group" tabIndex={0} aria-label={label + " Use arrow keys to inspect observations."}
    onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key) || !points.length) return;
      event.preventDefault();
      const index = points.findIndex(p => p.id === selected), next = event.key === "Home" ? 0 : event.key === "End" ? points.length - 1 : Math.max(0, Math.min(points.length - 1, index + (["ArrowLeft", "ArrowDown"].includes(event.key) ? -1 : 1)));
      onSelect(points[next]!.id);
    }} onClick={event => {
      if (!points.length) return;
      const bounds = event.currentTarget.getBoundingClientRect(), x = (event.clientX - bounds.left) / bounds.width * W, y = (event.clientY - bounds.top) / bounds.height * H;
      onSelect(points.reduce((a, b) => Math.hypot(b.x - x, b.y - y) < Math.hypot(a.x - x, a.y - y) ? b : a).id);
    }}>{children}</svg>;
}
function Grid({ domain, format, ticks, label }: { domain: [number, number]; format: (v: number) => string; ticks: { x: number; label: string }[]; label: string }) {
  const y = scale(domain, B, T);
  return <g aria-hidden="true">{Array.from({ length: 4 }, (_, i) => domain[0] + (domain[1] - domain[0]) * i / 3).map(value => <g key={value}><line x1={L} x2={R} y1={y(value)} y2={y(value)} stroke={line} /><text x={L - 8} y={y(value) + 4} textAnchor="end">{format(value)}</text></g>)}
    {ticks.map((tick, index) => <text key={index} x={tick.x} y={B + 21} textAnchor={index === 0 ? "start" : index === ticks.length - 1 ? "end" : "middle"}>{tick.label}</text>)}
    <text x={(L + R) / 2} y={H - 3} textAnchor="middle">{label}</text>
  </g>;
}
function Legend({ average = false }: { average?: boolean }) {
  return <div className="ac-legend"><span><i className={average ? "ac-line" : "ac-dot"} />{average ? "5-session average" : "Earlier sessions"}</span><span><i className="ac-current" />This session</span></div>;
}
const toggleItems = [{ id: "without", label: "Without session" }, { id: "with", label: "With session" }];

export function ActivityContext({ activity, state }: { activity: Activity; state: CompeteState }) {
  const history = sessionHistory(activity, state.activities, competeNow(state));
  if (!history.length) return null;
  const points = constellation(activity, history, state.units), hasScatter = points.length >= 4 && points.some(p => p.activity.id === activity.id);
  return <div className="activity-context"><header><AppHeading>You, in context</AppHeading><p>One session. A little more perspective.</p></header>
    {hasScatter && sportById(activity.sport).gps && <Scatter current={activity} history={history} units={state.units} />}
    <Trajectory current={activity} history={history} units={state.units} />
    {hasScatter && !sportById(activity.sport).gps && <Scatter current={activity} history={history} units={state.units} />}
    <Ripple current={activity} history={history} />
  </div>;
}
function Scatter({ current, history, units }: { current: Activity; history: Activity[]; units: UnitSystem }) {
  const [selected, setSelected] = useState(current.id), [showFit, setShowFit] = useState(true);
  const points = constellation(current, history, units), currentPoint = points.find(p => p.activity.id === current.id)!;
  const chosen = points.find(p => p.activity.id === selected) ?? currentPoint, metric = sportById(current.sport).gps ? "pace" : "time", fit = fitHistory(points, current.id);
  const xd = extent(points.map(p => p.x), 3), yd = extent([...points.map(p => p.y), ...(fit ? [fit.intercept + fit.slope * fit.min, fit.intercept + fit.slope * fit.max] : [])], metric === "pace" ? 12 : 3);
  const x = scale(xd, L, R), y = scale(yd, metric === "pace" ? T : B, metric === "pace" ? B : T);
  return <section className="ac-section"><AppHeading level={3}>{metric === "pace" ? "Among your sessions" : "Duration × heart rate"}</AppHeading><p>{points.length - 1} earlier {current.sport} sessions{metric === "pace" ? " within 20% of this distance" : " with recorded HR"} · last 90 days</p>
    <Readout title={chosen.activity.id === current.id ? "This session" : dateLabel(chosen.activity.startedAt)} value={formatMetric(chosen.y, metric, units)} detail={`${chosen.x} bpm average · ${Math.round(chosen.activity.movingSec / 60)} min`} />
    <small>{metric === "pace" ? `Session pace · min/${units === "metric" ? "km" : "mi"} · faster at top` : "Recorded duration · min"}</small>
    <Plot points={points.map(p => ({ id: p.activity.id, x: x(p.x), y: y(p.y) }))} selected={chosen.activity.id} onSelect={setSelected} label={`Session scatterplot. ${formatMetric(chosen.y, metric, units)} at ${chosen.x} bpm.`}>
      <Grid domain={metric === "pace" ? [yd[1], yd[0]] : yd} format={v => metric === "pace" ? formatMetric(v, metric, units).split("/")[0]! : `${Math.round(v)}`} ticks={[xd[0], (xd[0] + xd[1]) / 2, xd[1]].map(v => ({ x: x(v), label: `${Math.round(v)}` }))} label="Average heart rate · bpm" />
      {showFit && fit && <line x1={x(fit.min)} x2={x(fit.max)} y1={y(fit.intercept + fit.slope * fit.min)} y2={y(fit.intercept + fit.slope * fit.max)} stroke={teal} strokeWidth={2} strokeDasharray="5 5" />}
      <line x1={x(chosen.x)} x2={x(chosen.x)} y1={T} y2={B} stroke={line} />
      {points.filter(p => p.activity.id !== current.id).map(p => <circle key={p.activity.id} cx={x(p.x)} cy={y(p.y)} r={p.activity.id === selected ? 7 : 5} fill={teal} opacity={p.activity.id === selected ? 1 : .5} />)}
      <circle cx={x(currentPoint.x)} cy={y(currentPoint.y)} r={12} fill={yellow} opacity={.24} /><circle cx={x(currentPoint.x)} cy={y(currentPoint.y)} r={7} fill={yellow} stroke={ink} strokeWidth={2} />
    </Plot><Legend /><div className="ac-choices"><button type="button" onClick={() => setSelected(current.id)}>Focus this session</button>{fit && <button type="button" aria-pressed={showFit} onClick={() => setShowFit(!showFit)}>{showFit ? "Hide" : "Show"} history line</button>}</div>
    <small>{fit ? "History line uses earlier sessions only. " : ""}{metric === "pace" ? "Distance is matched; route, conditions and workout intent may differ." : "Duration and HR do not describe strength load or sets."}</small>
  </section>;
}
function Trajectory({ current, history, units }: { current: Activity; history: Activity[]; units: UnitSystem }) {
  const hasEfficiency = efficiencyBaseline(current, history, units) !== null && metricValue(current, "efficiency", units) !== null;
  const defaultMetric = hasEfficiency ? "efficiency" : metricValue(current, "pace", units) !== null ? "pace" : "time";
  const [requestedMetric, setMetric] = useState<Metric>(defaultMetric), [included, setIncluded] = useState(true), [selected, setSelected] = useState(current.id);
  const metric = requestedMetric === "efficiency" ? hasEfficiency ? requestedMetric : defaultMetric : metricValue(current, requestedMetric, units) !== null ? requestedMetric : defaultMetric;
  const rows = trajectory(current, history, metric, units), chosen = rows.find(r => r.activity.id === selected) ?? rows.at(-1), currentPoint = rows.find(r => r.activity.id === current.id);
  const previous = rows.filter(r => r.activity.id !== current.id).at(-1)?.average, delta = currentPoint?.average != null && previous != null ? currentPoint.average - previous : null;
  const xd = extent(rows.length ? rows.map(r => r.time) : [Date.parse(current.startedAt)], 86400000), yd = extent([...rows.map(r => r.value), ...(metric === "efficiency" ? [100] : [])], metric === "pace" ? 12 : 3);
  const x = scale(xd, L, R), y = scale(yd, metric === "pace" ? T : B, metric === "pace" ? B : T);
  const averages = rows.filter(r => r.average !== null && (included || r.activity.id !== current.id));
  const items: { id: Metric; label: string }[] = [...(metricValue(current, "pace", units) !== null ? [{ id: "pace" as const, label: "Pace" }] : []), { id: "time", label: "Moving time" }, ...(metricValue(current, "hr", units) !== null ? [{ id: "hr" as const, label: "Heart rate" }] : []), ...(hasEfficiency ? [{ id: "efficiency" as const, label: "Speed / HR" }] : [])];
  return <section className="ac-section"><AppHeading level={3}>Your recent trajectory</AppHeading><p>Your last {rows.length} {current.sport} sessions{metric === "pace" || metric === "efficiency" ? " at similar distances" : ""}. Tap any dot to explore.</p>
    <Choices items={items} value={metric} onChange={id => { setMetric(id); setSelected(current.id); }} label="Trajectory measure" />
    {chosen && <Readout title={chosen.activity.id === current.id ? "This session" : dateLabel(chosen.activity.startedAt)} value={formatMetric(chosen.value, metric, units)} detail={!included && chosen.activity.id === current.id ? previous == null ? "Excluded from the recent average" : `Excluded · preceding average ${formatMetric(previous, metric, units)}` : chosen.average === null ? "Fewer than 5 observations at this point" : `5-session average · ${formatMetric(chosen.average, metric, units)}`} />}
    <Choices items={toggleItems} value={included ? "with" : "without"} onChange={id => setIncluded(id === "with")} label="Include selected activity in trajectory" />
    <small>{metric === "efficiency" ? "Speed / HR index · previous median = 100" : metric === "pace" ? `Session pace · min/${units === "metric" ? "km" : "mi"} · faster at top` : metric === "time" ? "Moving time · minutes" : "Average heart rate · bpm"}</small>
    <Plot points={rows.map(r => ({ id: r.activity.id, x: x(r.time), y: y(r.value) }))} selected={chosen?.activity.id ?? current.id} onSelect={setSelected} label={`Recent ${metric} trajectory. ${chosen ? formatMetric(chosen.value, metric, units) : "No observations"}. ${included ? "Including" : "Excluding"} selected session from average.`}>
      <Grid domain={metric === "pace" ? [yd[1], yd[0]] : yd} format={v => metric === "pace" ? formatMetric(v, metric, units).split("/")[0]! : `${Math.round(v)}`} ticks={rows.filter((r, i) => i === 0 || i === Math.floor(rows.length / 2) || i === rows.length - 1).map(r => ({ x: x(r.time), label: dateLabel(r.activity.startedAt) }))} label="Session date" />
      {metric === "efficiency" && <line x1={L} x2={R} y1={y(100)} y2={y(100)} stroke={muted} strokeDasharray="4 5" />}
      {averages.length > 1 && <path d={path(averages.map(r => ({ x: x(r.time), y: y(r.average!) })))} fill="none" stroke={teal} strokeWidth={3} />}
      {chosen && <line x1={x(chosen.time)} x2={x(chosen.time)} y1={T} y2={B} stroke={line} />}
      {rows.map(r => <circle key={r.activity.id} cx={x(r.time)} cy={y(r.value)} r={r.activity.id === current.id ? 7 : r.activity.id === chosen?.activity.id ? 6 : 4} fill={r.activity.id === current.id ? included ? yellow : "var(--paper)" : teal} stroke={r.activity.id === current.id ? ink : "var(--paper)"} strokeWidth={r.activity.id === current.id ? 2 : 1} opacity={r.activity.id === current.id ? 1 : .65} />)}
      {included && currentPoint?.average != null && <circle cx={x(currentPoint.time)} cy={y(currentPoint.average)} r={5} fill={teal} />}
    </Plot><Legend average={averages.length > 1} />
    {metric === "efficiency" && currentPoint && <b>{currentPoint.value >= 100 ? "+" : "−"}{Math.abs(currentPoint.value - 100).toFixed(1)}% vs your previous median · dashed line = 100</b>}
    {delta !== null ? <div className="ac-insight"><b>The recent average shifts by {delta < 0 ? "−" : "+"}{metric === "pace" ? `${Math.round(Math.abs(delta))} sec/${units === "metric" ? "km" : "mi"}` : metric === "efficiency" ? `${Math.abs(delta).toFixed(1)} points` : formatMetric(Math.abs(delta), metric, units)}</b><small>{formatMetric(previous!, metric, units)} → {formatMetric(currentPoint!.average!, metric, units)}. This session enters the 5-session window and its oldest session rolls out.</small></div> : <small>The moving average needs 5 observations; a before/after change needs 5 earlier sessions plus this one.</small>}
    <small>{metric === "efficiency" ? "Speed ÷ average heart rate, indexed to your previous 90-day median (100). Higher means more speed relative to recorded HR, not a fitness score. Route, conditions and workout intent may differ." : "Dots are sessions; the line is their 5-session average. Pace uses distances within 20% of this session."}</small>
  </section>;
}
function Ripple({ current, history }: { current: Activity; history: Activity[] }) {
  const [included, setIncluded] = useState(true), [selected, setSelected] = useState<string | null>(null);
  const days = volumeHistory(current, history), latest = days.at(-1)!, chosen = days.find(d => d.key === selected) ?? latest;
  const yd: [number, number] = [0, Math.max(...days.map(d => d.minutes), 10) * 1.15], y = scale(yd, B, T), x = (index: number) => L + 6 + index / 27 * (R - L - 12), average = included ? latest.average : latest.averageWithout;
  return <section className="ac-section"><AppHeading level={3}>What this added</AppHeading><p>Your recorded {current.sport} minutes. See what changes with this session.</p><div className="ac-volume"><strong>{average.toFixed(1)}</strong><span>min / day · 7-day average</span></div>
    <Choices items={toggleItems} value={included ? "with" : "without"} onChange={id => setIncluded(id === "with")} label="Include selected activity in volume" /><small>Recorded minutes / day</small>
    <Plot points={days.map((d, i) => ({ id: d.key, x: x(i), y: y(included ? d.minutes : d.without) }))} selected={chosen.key} onSelect={setSelected} label={`Logged volume. ${dateLabel(chosen.date)}: ${Math.round(included ? chosen.minutes : chosen.without)} minutes.`}>
      <Grid domain={yd} format={v => `${Math.round(v)}`} ticks={[0, 13, 27].map(i => ({ x: x(i), label: dateLabel(days[i]!.date) }))} label="Day · America/New_York" />
      {days.map((d, i) => <rect key={d.key} x={x(i) - 3} y={y(d.without)} width={6} height={B - y(d.without)} rx={2} fill={muted} opacity={.4} />)}
      {included && <rect x={x(27) - 3} y={y(latest.minutes)} width={6} height={y(latest.without) - y(latest.minutes)} rx={2} fill={yellow} />}
      <path d={path(days.map((d, i) => ({ x: x(i), y: y(included ? d.average : d.averageWithout) })))} fill="none" stroke={teal} strokeWidth={3} /><line x1={x(days.indexOf(chosen))} x2={x(days.indexOf(chosen))} y1={T} y2={B} stroke={ink} opacity={.25} /><circle cx={x(27)} cy={y(average)} r={5} fill={yellow} stroke={ink} strokeWidth={2} />
    </Plot><div className="ac-legend"><span>Bars · daily minutes</span><span>Line · 7-day average</span></div>
    <Readout title={dateLabel(chosen.date)} value={`${Math.round(included ? chosen.minutes : chosen.without)} min recorded`} detail={`7-day average · ${(included ? chosen.average : chosen.averageWithout).toFixed(1)} min/day`} />
    <div className="ac-insight"><b>This session adds {Math.round(current.movingSec / 60)} min to logged volume</b><small>Your 7-day average gains +{(latest.average - latest.averageWithout).toFixed(1)} min/day. Recorded volume only.</small></div><small>Unlogged days count as zero. This view ends at the selected session.</small>
  </section>;
}
