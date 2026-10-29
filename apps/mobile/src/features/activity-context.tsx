import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { competeNow, sportById, type Activity, type CompeteState, type UnitSystem,
  activityContextConstellation as constellation, activityContextDateLabel as dateLabel,
  activityContextFitHistory as fitHistory, activityContextFormatMetric as formatMetric,
  activityContextMean as mean, activityContextMetricValue as metricValue,
  activityContextSessionHistory as sessionHistory, activityContextTrajectory as trajectory,
  activityContextVolumeHistory as volumeHistory, activityContextEfficiencyBaseline as efficiencyBaseline,
  type ActivityContextMetric as Metric } from "@fitness-battle/shared";
import { AppText, chartTextProps } from "../ui/section";
import { Chip, ChipRow } from "../ui/chip";
import { SHELL_COLORS as c } from "../theme";
type Point = { id: string; x: number; y: number };
const H = 258, TOP = 18, BOTTOM = H - 46, LEFT = 52;
const path = (points: { x: number; y: number }[]) => points.map((point, i) => `${i ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
function extent(values: number[], minimumPadding = 1): [number, number] {
  const min = Math.min(...values), max = Math.max(...values), padding = Math.max(minimumPadding, (max - min) * .16);
  return [min - padding, max + padding];
}
function scale(domain: [number, number], low: number, high: number) {
  return (value: number) => low + (value - domain[0]) / (domain[1] - domain[0] || 1) * (high - low);
}

export function ActivityContext({ activity, state }: { activity: Activity; state: CompeteState }) {
  const s = useThemedStyles(sThemes);

  const now = competeNow(state).getTime();
  const history = useMemo(() => sessionHistory(activity, state.activities, new Date(now)), [activity, state.activities, now]);

  if (!history.length) return null;
  const points = constellation(activity, history, state.units);
  const hasScatter = points.some(point => point.activity.id === activity.id) && points.length >= 4;
  return <View style={s.sections}>
    {hasScatter && sportById(activity.sport).gps ? <View style={s.surface}><Constellation current={activity} history={history} units={state.units} /></View> : null}
    <View style={s.surface}><Trajectory current={activity} history={history} units={state.units} /></View>
    {hasScatter && !sportById(activity.sport).gps ? <View style={s.surface}><Constellation current={activity} history={history} units={state.units} /></View> : null}
    <View style={s.surface}><Ripple current={activity} history={history} /></View>
  </View>;
}

function Choices<T extends string>({ items, value, onChange, label }: { items: readonly { id: T; label: string }[]; value: T; onChange: (value: T) => void; label: string }) {
  return <ChipRow>
    {items.map(item => (
      <Chip
        key={item.id}
        label={item.label}
        selected={item.id === value}
        onPress={() => onChange(item.id)}
        accessibilityLabel={item.label}
      />
    ))}
  </ChipRow>;
}

function Plot({ width, points, selected, onSelect, label, children }: { width: number; points: Point[]; selected: string; onSelect: (id: string) => void; label: string; children: ReactNode }) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const next = (step: number) => { const index = points.findIndex(p => p.id === selected); const point = points[Math.max(0, Math.min(points.length - 1, index + step))]; if (point) onSelect(point.id); };
  return <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityHint="Tap a point to inspect. Swipe up or down to inspect adjacent sessions." accessibilityActions={[{ name: "increment", label: "Next observation" }, { name: "decrement", label: "Previous observation" }]} onAccessibilityAction={event => next(event.nativeEvent.actionName === "increment" ? 1 : -1)}
    onTouchStart={event => { start.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }; }}
    onTouchEnd={event => {
      const prior = start.current; start.current = null;
      if (!prior || Math.hypot(prior.x - event.nativeEvent.pageX, prior.y - event.nativeEvent.pageY) > 12 || !points.length) return;
      const x = event.nativeEvent.locationX, y = event.nativeEvent.locationY;
      const nearest = points.reduce((best, point) => Math.hypot(point.x - x, point.y - y) < Math.hypot(best.x - x, best.y - y) ? point : best);
      onSelect(nearest.id);
    }} onTouchCancel={() => { start.current = null; }}>
    <View pointerEvents="none"><Svg width={width} height={H} viewBox={`0 0 ${width} ${H}`}>{children}</Svg></View>
  </View>;
}

function Grid({ width, yDomain, yFormat, xTicks, xLabel, yLabel }: { width: number; yDomain: [number, number]; yFormat: (value: number) => string; xTicks: { x: number; label: string }[]; xLabel: string; yLabel?: string }) {
  const c = useThemeColors();

  const y = scale(yDomain, BOTTOM, TOP);
  const midY = (TOP + BOTTOM) / 2;
  return <>
    {yLabel ? <G transform={`translate(13 ${midY}) rotate(-90)`}><SvgText x={0} y={0} textAnchor="middle" fill={c.muted} {...chartTextProps()}>{yLabel}</SvgText></G> : null}
    {Array.from({ length: 4 }, (_, i) => yDomain[0] + (yDomain[1] - yDomain[0]) * i / 3).map(value => <ViewlessGrid key={value} value={value} py={y(value)} width={width} label={yFormat(value)} />)}
    {xTicks.map((tick, index) => <SvgText key={`${tick.x}-${index}`} x={tick.x} y={BOTTOM + 21} fill={c.muted} {...chartTextProps()} textAnchor={index === 0 ? "start" : index === xTicks.length - 1 ? "end" : "middle"}>{tick.label}</SvgText>)}
    <SvgText x={(LEFT + width - 16) / 2} y={H - 3} textAnchor="middle" fill={c.muted} {...chartTextProps()}>{xLabel}</SvgText>
  </>;
}
function ViewlessGrid({ py, width, label }: { value: number; py: number; width: number; label: string }) {
  const c = useThemeColors();
 return <><Line x1={LEFT} x2={width - 16} y1={py} y2={py} stroke={c.line} strokeWidth={1} /><SvgText x={LEFT - 8} y={py + 4} textAnchor="end" fill={c.muted} {...chartTextProps()}>{label}</SvgText></>; }
function Legend({ line = false, current = true }: { line?: boolean; current?: boolean }) {
  const s = useThemedStyles(sThemes);
 return <View style={s.legend}><View style={s.legendItem}><View style={line ? s.lineKey : s.dotKey} /><AppText role="caption" secondary>{line ? "5-session average" : "Earlier sessions"}</AppText></View>{current && <View style={s.legendItem}><View style={s.currentKey} /><AppText role="caption" secondary>This session</AppText></View>}</View>; }
function Readout({ title, value, detail }: { title: string; value: string; detail?: string }) {
  const s = useThemedStyles(sThemes);
 return <View style={s.readout} accessibilityLiveRegion="polite"><AppText role="label">{title}</AppText><AppText role="metric">{value}</AppText>{detail ? <AppText role="caption" secondary>{detail}</AppText> : null}</View>; }

function Constellation({ current, history, units }: { current: Activity; history: Activity[]; units: UnitSystem }) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);

  const [width, setWidth] = useState(330), [selected, setSelected] = useState(current.id), [showFit, setShowFit] = useState(true);
  const points = constellation(current, history, units), currentPoint = points.find(p => p.activity.id === current.id);
  const metric = sportById(current.sport).gps ? "pace" : "time";
  const fit = fitHistory(points, current.id);
  if (!currentPoint || points.length < 4) return null;
  const chosen = points.find(point => point.activity.id === selected) ?? currentPoint;
  const fitValues = fit ? [fit.intercept + fit.slope * fit.min, fit.intercept + fit.slope * fit.max] : [];
  const xd = extent(points.map(p => p.x), 3), yd = extent([...points.map(p => p.y), ...fitValues], metric === "pace" ? 12 : 3);
  const x = scale(xd, LEFT, width - 16), y = scale(yd, metric === "pace" ? TOP : BOTTOM, metric === "pace" ? BOTTOM : TOP);
  const renderY = metric === "pace" ? ([yd[1], yd[0]] as [number, number]) : yd;
  const ticks = [xd[0], mean(xd), xd[1]].map(value => ({ x: x(value), label: `${Math.round(value)}` }));
  const yLabel = metric === "pace" ? `Pace (${units === "metric" ? "min/km" : "min/mi"})` : "Duration (min)";
  return <View style={s.concept} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <AppText role="heading" accessibilityRole="header">{metric === "pace" ? "Compared to similar sessions" : "Duration × heart rate"}</AppText>
    <Readout title={chosen.activity.id === current.id ? "This session" : dateLabel(chosen.activity.startedAt)} value={formatMetric(chosen.y, metric, units)} detail={`${chosen.x} bpm average · ${Math.round(chosen.activity.movingSec / 60)} min`} />
    <Plot width={width} points={points.map(p => ({ id: p.activity.id, x: x(p.x), y: y(p.y) }))} selected={chosen.activity.id} onSelect={setSelected} label={`Session scatterplot. ${formatMetric(chosen.y, metric, units)} at ${chosen.x} bpm. ${chosen.activity.id === current.id ? "Current session." : dateLabel(chosen.activity.startedAt)}`}>
      <Grid width={width} yDomain={renderY} yFormat={value => metric === "pace" ? formatMetric(value, metric, units).split("/")[0]! : `${Math.round(value)}`} xTicks={ticks} xLabel="Average heart rate · bpm" yLabel={yLabel} />
      {showFit && fit ? <Line x1={x(fit.min)} x2={x(fit.max)} y1={y(fit.intercept + fit.slope * fit.min)} y2={y(fit.intercept + fit.slope * fit.max)} stroke={c.secondary} strokeWidth={2} strokeDasharray="5 5" /> : null}
      <Line x1={x(chosen.x)} x2={x(chosen.x)} y1={TOP} y2={BOTTOM} stroke={c.line} strokeWidth={1} />
      {points.filter(p => p.activity.id !== current.id).map(p => <Circle key={p.activity.id} cx={x(p.x)} cy={y(p.y)} r={p.activity.id === chosen.activity.id ? 7 : 5} fill={c.fieldTeal} opacity={p.activity.id === chosen.activity.id ? 1 : .52} />)}
      <Circle cx={x(currentPoint.x)} cy={y(currentPoint.y)} r={12} fill={c.tennis} opacity={.24} /><Circle cx={x(currentPoint.x)} cy={y(currentPoint.y)} r={7} fill={c.tennis} stroke={c.ink} strokeWidth={2} />
    </Plot>
    <Legend />
    {fit ? <ChipRow><Chip label={showFit ? "Hide history line" : "Show history line"} selected={showFit} onPress={() => setShowFit(!showFit)} /></ChipRow> : null}
  </View>;
}

function Trajectory({ current, history, units }: { current: Activity; history: Activity[]; units: UnitSystem }) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);

  const hasEfficiency = efficiencyBaseline(current, history, units) !== null && metricValue(current, "efficiency", units) !== null;
  const defaultMetric = hasEfficiency ? "efficiency" : metricValue(current, "pace", units) !== null ? "pace" : "time";
  const [requestedMetric, setMetric] = useState<Metric>(defaultMetric), [selected, setSelected] = useState(current.id), [width, setWidth] = useState(330);
  const metric = requestedMetric === "efficiency" ? hasEfficiency ? requestedMetric : defaultMetric : metricValue(current, requestedMetric, units) !== null ? requestedMetric : defaultMetric;
  const rows = trajectory(current, history, metric, units), chosen = rows.find(row => row.activity.id === selected) ?? rows.at(-1);
  const currentPoint = rows.find(row => row.activity.id === current.id), previousAverage = rows.filter(row => row.activity.id !== current.id).at(-1)?.average;
  const values = [...rows.map(row => row.value), ...(metric === "efficiency" ? [100] : [])], xd = extent(rows.length ? rows.map(row => row.time) : [Date.parse(current.startedAt)], 86400000), yd = extent(values.length ? values : [0, 1], metric === "pace" ? 12 : 3);
  const x = scale(xd, LEFT, width - 16), y = scale(yd, metric === "pace" ? TOP : BOTTOM, metric === "pace" ? BOTTOM : TOP);
  const renderY = metric === "pace" ? ([yd[1], yd[0]] as [number, number]) : yd;
  const active = rows, averages = active.filter(row => row.average !== null);
  const metricItems: { id: Metric; label: string }[] = [...(metricValue(current, "pace", units) === null ? [] : [{ id: "pace" as const, label: "Pace" }]), { id: "time", label: "Moving time" }, ...(metricValue(current, "hr", units) !== null ? [{ id: "hr" as const, label: "Heart rate" }] : []), ...(hasEfficiency ? [{ id: "efficiency" as const, label: "Speed / HR" }] : [])];
  const delta = currentPoint?.average !== null && currentPoint?.average !== undefined && previousAverage !== null && previousAverage !== undefined ? currentPoint.average - previousAverage : null;
  const yLabel = metric === "efficiency" ? "Speed / HR index" : metric === "pace" ? `Pace (${units === "metric" ? "min/km" : "min/mi"})` : metric === "time" ? "Moving time (min)" : "Heart rate (bpm)";
  return <View style={s.concept} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <AppText role="heading" accessibilityRole="header">Your recent trajectory</AppText>
    <Choices items={metricItems} value={metric} onChange={next => { setMetric(next); setSelected(current.id); }} label="Trajectory measure" />
    {chosen ? <Readout title={chosen.activity.id === current.id ? "This session" : dateLabel(chosen.activity.startedAt)} value={formatMetric(chosen.value, metric, units)} detail={chosen.average === null ? undefined : `5-session average · ${formatMetric(chosen.average, metric, units)}`} /> : null}
    <Plot width={width} points={rows.map(row => ({ id: row.activity.id, x: x(row.time), y: y(row.value) }))} selected={chosen?.activity.id ?? current.id} onSelect={setSelected} label={`Recent ${metric} trajectory. ${chosen ? formatMetric(chosen.value, metric, units) : "No observations"}.`}>
      <Grid width={width} yDomain={renderY} yFormat={value => metric === "pace" ? formatMetric(value, metric, units).split("/")[0]! : `${Math.round(value)}`} xTicks={rows.filter((row, index) => index === 0 || index === Math.floor(rows.length / 2) || index === rows.length - 1).map(row => ({ x: x(row.time), label: dateLabel(row.activity.startedAt) }))} xLabel="Session date" yLabel={yLabel} />
      {metric === "efficiency" ? <Line x1={LEFT} x2={width - 16} y1={y(100)} y2={y(100)} stroke={c.secondary} strokeDasharray="4 5" /> : null}
      {averages.length > 1 ? <Path d={path(averages.map(row => ({ x: x(row.time), y: y(row.average!) })))} stroke={c.fieldTeal} fill="none" strokeWidth={3} /> : null}
      {chosen ? <Line x1={x(chosen.time)} x2={x(chosen.time)} y1={TOP} y2={BOTTOM} stroke={c.line} strokeWidth={1} /> : null}
      {rows.map(row => <Circle key={row.activity.id} cx={x(row.time)} cy={y(row.value)} r={row.activity.id === current.id ? 7 : row.activity.id === chosen?.activity.id ? 6 : 4} fill={row.activity.id === current.id ? c.tennis : c.secondary} stroke={row.activity.id === current.id ? c.ink : c.paper} strokeWidth={row.activity.id === current.id ? 2 : 1} opacity={row.activity.id === current.id ? 1 : .7} />)}
      {currentPoint?.average !== null && currentPoint?.average !== undefined ? <Circle cx={x(currentPoint.time)} cy={y(currentPoint.average)} r={5} fill={c.fieldTeal} /> : null}
    </Plot>
    <Legend line={averages.length > 1} />
    {delta !== null ? <View style={s.insight}><AppText role="label">The recent average shifts by {delta < 0 ? "−" : "+"}{metric === "pace" ? `${Math.round(Math.abs(delta))} sec/${units === "metric" ? "km" : "mi"}` : metric === "efficiency" ? `${Math.abs(delta).toFixed(1)} points` : formatMetric(Math.abs(delta), metric, units)}</AppText></View> : null}
  </View>;
}

function Ripple({ current, history }: { current: Activity; history: Activity[] }) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);

  const [selected, setSelected] = useState<string | null>(null), [width, setWidth] = useState(330);
  const days = volumeHistory(current, history), latest = days.at(-1)!, chosen = days.find(day => day.key === selected) ?? latest;
  const max = Math.max(...days.map(day => day.minutes), 10) * 1.15, yd: [number, number] = [0, max];
  const x = (index: number) => LEFT + 6 + index / 27 * (width - LEFT - 28), y = scale(yd, BOTTOM, TOP);
  const average = latest.average;
  return <View style={s.concept} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <AppText role="heading" accessibilityRole="header">What this added</AppText>
    <View style={s.hero}><AppText role="hero">{average.toFixed(1)}</AppText><AppText role="body" secondary>min / day · 7-day average</AppText></View>
    <Plot width={width} points={days.map((day, index) => ({ id: day.key, x: x(index), y: y(day.minutes) }))} selected={chosen.key} onSelect={setSelected} label={`Logged volume. ${dateLabel(chosen.date)}: ${Math.round(chosen.minutes)} minutes. ${chosen.average.toFixed(1)} minutes per day rolling average on this day.`}>
      <Grid width={width} yDomain={yd} yFormat={value => `${Math.round(value)}`} xTicks={[0, 13, 27].map(index => ({ x: x(index), label: dateLabel(days[index]!.date) }))} xLabel="Day · America/New_York" yLabel="Minutes / day" />
      {days.map((day, index) => <Rect key={day.key} x={x(index) - Math.max(2, (width - LEFT - 28) / 28 * .28)} y={y(day.without)} width={Math.max(4, (width - LEFT - 28) / 28 * .56)} height={BOTTOM - y(day.without)} rx={2} fill={c.secondary} opacity={.45} />)}
      <Rect x={x(27) - Math.max(2, (width - LEFT - 28) / 28 * .28)} y={y(latest.minutes)} width={Math.max(4, (width - LEFT - 28) / 28 * .56)} height={y(latest.without) - y(latest.minutes)} rx={2} fill={c.tennis} />
      <Path d={path(days.map((day, index) => ({ x: x(index), y: y(day.average) })))} fill="none" stroke={c.fieldTeal} strokeWidth={3} />
      <Line x1={x(days.indexOf(chosen))} x2={x(days.indexOf(chosen))} y1={TOP} y2={BOTTOM} stroke={c.ink} strokeWidth={1} opacity={.25} />
      <Circle cx={x(27)} cy={y(average)} r={5} fill={c.tennis} stroke={c.ink} strokeWidth={2} />
    </Plot>
    <View style={s.legend}><AppText role="caption" secondary>Bars · daily minutes</AppText><AppText role="caption" secondary>Line · 7-day average</AppText></View>
    <Readout title={dateLabel(chosen.date)} value={`${Math.round(chosen.minutes)} min recorded`} detail={`7-day average · ${chosen.average.toFixed(1)} min/day`} />
  </View>;
}

const sThemes = createThemedStyles((themeColors) => ({
  sections: { gap: 24 }, surface: { gap: 12, paddingVertical: 24, borderTopWidth: 1, borderColor: themeColors.line },
  concept: { gap: 12 }, readout: { gap: 3 }, hero: { flexDirection: "row", alignItems: "baseline", gap: 10, flexWrap: "wrap" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 16 }, legendItem: { flexDirection: "row", gap: 7, alignItems: "center" },
  dotKey: { width: 9, height: 9, borderRadius: 5, backgroundColor: themeColors.fieldTeal }, lineKey: { width: 19, height: 3, borderRadius: 2, backgroundColor: themeColors.fieldTeal }, currentKey: { width: 10, height: 10, borderRadius: 5, backgroundColor: themeColors.tennis, borderColor: themeColors.ink, borderWidth: 1 },
  insight: { gap: 8, paddingVertical: 16, borderTopWidth: 1, borderColor: themeColors.line },
}));
