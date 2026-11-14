import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import {
  competeNow, computeNiceAxisTicks, sportById, type Activity, type CompeteState, type UnitSystem,
  activityContextConstellation as constellation, activityContextDateLabel as dateLabel,
  activityContextFitHistory as fitHistory, activityContextFormatMetric as formatMetric,
  activityContextMetricValue as metricValue,
  activityContextSessionHistory as sessionHistory, activityContextTrajectory as trajectory,
  activityContextVolumeHistory as volumeHistory, activityContextEfficiencyBaseline as efficiencyBaseline,
  type ActivityContextMetric as Metric,
} from "@fitness-battle/shared";
import { AppText, chartTextProps } from "../ui/section";
import { ChartScrubber, type ChartDatum } from "../ui/chart-scrubber";
import { Chip, ChipRow } from "../ui/chip";

type Point = { id: string; x: number; y: number };
const W = 340, H = 216, TOP = 26, BOTTOM = H - 30, LEFT = 46, RIGHT = W - 14;
const path = (points: { x: number; y: number }[]) => points.map((point, i) => `${i ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
function extent(values: number[], minimumPadding = 1, clampZero = true): [number, number] {
  const min = Math.min(...values), max = Math.max(...values), padding = Math.max(minimumPadding, (max - min) * .16);
  const low = clampZero && min >= 0 ? Math.max(0, min - padding) : min - padding;
  return [low, max + padding];
}
function scale(domain: [number, number], low: number, high: number) {
  return (value: number) => low + (value - domain[0]) / (domain[1] - domain[0] || 1) * (high - low);
}
function paceAxisTicks(domain: [number, number]): number[] {
  const step = Math.max(15, Math.round((domain[1] - domain[0]) / 3 / 15) * 15 || 15);
  const lo = Math.floor(domain[0] / step) * step;
  const hi = Math.ceil(domain[1] / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + 0.01 && ticks.length < 4; v += step) ticks.push(v);
  return ticks.length >= 2 ? ticks : [domain[0], (domain[0] + domain[1]) / 2, domain[1]];
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

function Choices<T extends string>({ items, value, onChange }: { items: readonly { id: T; label: string }[]; value: T; onChange: (value: T) => void }) {
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

function ScatterPlot({ width, points, selected, onSelect, label, children }: { width: number; points: Point[]; selected: string; onSelect: (id: string) => void; label: string; children: ReactNode }) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const next = (step: number) => { const index = points.findIndex(p => p.id === selected); const point = points[Math.max(0, Math.min(points.length - 1, index + step))]; if (point) onSelect(point.id); };
  return <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityHint="Tap a point to inspect. Swipe up or down to inspect adjacent sessions." accessibilityActions={[{ name: "increment", label: "Next observation" }, { name: "decrement", label: "Previous observation" }]} onAccessibilityAction={event => next(event.nativeEvent.actionName === "increment" ? 1 : -1)}
    onTouchStart={event => { start.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }; }}
    onTouchEnd={event => {
      const prior = start.current; start.current = null;
      if (!prior || Math.hypot(prior.x - event.nativeEvent.pageX, prior.y - event.nativeEvent.pageY) > 12 || !points.length) return;
      const x = event.nativeEvent.locationX * (W / Math.max(1, width)), y = event.nativeEvent.locationY;
      const nearest = points.reduce((best, point) => Math.hypot(point.x - x, point.y - y) < Math.hypot(best.x - x, best.y - y) ? point : best);
      onSelect(nearest.id);
    }} onTouchCancel={() => { start.current = null; }}>
    <View pointerEvents="none"><Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">{children}</Svg></View>
  </View>;
}

function AxesGrid({ yTicks, yFormat, xTicks }: { yTicks: Array<{ value: number; py: number }>; yFormat: (value: number) => string; xTicks: { x: number; label: string }[] }) {
  const c = useThemeColors();
  return <>
    <Line x1={LEFT} x2={LEFT} y1={TOP} y2={BOTTOM} stroke={c.line} strokeWidth={1} />
    <Line x1={LEFT} x2={RIGHT} y1={BOTTOM} y2={BOTTOM} stroke={c.line} strokeWidth={1} />
    {yTicks.map((tick, index) => (
      <G key={`${tick.value}-${index}`}>
        <Line x1={LEFT} x2={RIGHT} y1={tick.py} y2={tick.py} stroke={c.secondary} strokeWidth={0.5} opacity={0.3} />
        <SvgText x={LEFT - 6} y={tick.py + 4} textAnchor="end" fill={c.secondary} {...chartTextProps()}>{yFormat(tick.value)}</SvgText>
      </G>
    ))}
    {xTicks.map((tick, index) => <SvgText key={`${tick.x}-${index}`} x={tick.x} y={BOTTOM + 19} fill={c.muted} {...chartTextProps()} textAnchor={index === 0 ? "start" : index === xTicks.length - 1 ? "end" : "middle"}>{tick.label}</SvgText>)}
  </>;
}
function Legend({ line = false, current = true }: { line?: boolean; current?: boolean }) {
  const s = useThemedStyles(sThemes);
  return <View style={s.legend}><View style={s.legendItem}><View style={line ? s.lineKey : s.dotKey} /><AppText role="caption" secondary>{line ? "5-session trend" : "Earlier sessions"}</AppText></View>{current && <View style={s.legendItem}><View style={s.currentKey} /><AppText role="caption" secondary>This session</AppText></View>}</View>;
}
function Readout({ title, value, detail }: { title?: string; value: string; detail?: string }) {
  const s = useThemedStyles(sThemes);
  return <View style={s.readout} accessibilityLiveRegion="polite">{title ? <AppText role="label">{title}</AppText> : null}<AppText role="metric">{value}</AppText>{detail ? <AppText role="caption" secondary>{detail}</AppText> : null}</View>;
}

function Constellation({ current, history, units }: { current: Activity; history: Activity[]; units: UnitSystem }) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);

  const [width, setWidth] = useState(W), [selected, setSelected] = useState(current.id), [showFit, setShowFit] = useState(true);
  const points = constellation(current, history, units), currentPoint = points.find(p => p.activity.id === current.id);
  const metric = sportById(current.sport).gps ? "pace" : "time";
  const fit = fitHistory(points, current.id);
  if (!currentPoint || points.length < 4) return null;
  const chosen = points.find(point => point.activity.id === selected) ?? currentPoint;
  const fitValues = fit ? [fit.intercept + fit.slope * fit.min, fit.intercept + fit.slope * fit.max] : [];
  const rawX = points.map(p => p.x);
  const rawY = [...points.map(p => p.y), ...fitValues];
  const xNice = computeNiceAxisTicks(Math.min(...rawX), Math.max(...rawX), false);
  const xd: [number, number] = [xNice.yMin, xNice.yMax];
  const yNice = metric === "pace" ? null : computeNiceAxisTicks(Math.min(...rawY), Math.max(...rawY), true);
  const paceDomain = extent(rawY, 12, true);
  const yd: [number, number] = yNice ? [yNice.yMin, yNice.yMax] : paceDomain;
  const x = scale(xd, LEFT, RIGHT), y = scale(yd, metric === "pace" ? TOP : BOTTOM, metric === "pace" ? BOTTOM : TOP);
  const yTicks = (yNice ? yNice.ticks : paceAxisTicks(paceDomain)).map(value => ({ value, py: y(value) }));
  const xTickValues = xNice.ticks.length <= 4 ? xNice.ticks : [xNice.ticks[0]!, xNice.ticks[Math.floor(xNice.ticks.length / 2)]!, xNice.ticks.at(-1)!];
  const xTicks = xTickValues.map(value => ({ x: x(value), label: `${Math.round(value)}` }));
  return <View style={s.concept} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <AppText role="heading" accessibilityRole="header">{metric === "pace" ? "Compared to similar sessions" : "Duration × heart rate"}</AppText>
    <Readout title={chosen.activity.id === current.id ? "This session" : dateLabel(chosen.activity.startedAt)} value={formatMetric(chosen.y, metric, units)} detail={`${chosen.x} bpm average · ${Math.round(chosen.activity.movingSec / 60)} min`} />
    <ScatterPlot width={width} points={points.map(p => ({ id: p.activity.id, x: x(p.x), y: y(p.y) }))} selected={chosen.activity.id} onSelect={setSelected} label={`Session scatterplot. ${formatMetric(chosen.y, metric, units)} at ${chosen.x} bpm. ${chosen.activity.id === current.id ? "Current session." : dateLabel(chosen.activity.startedAt)}`}>
      <AxesGrid yTicks={yTicks} yFormat={value => metric === "pace" ? formatMetric(value, metric, units).split("/")[0]! : `${Math.round(value)}`} xTicks={xTicks} />
      {showFit && fit ? <Line x1={x(fit.min)} x2={x(fit.max)} y1={y(fit.intercept + fit.slope * fit.min)} y2={y(fit.intercept + fit.slope * fit.max)} stroke={c.secondary} strokeWidth={1.75} strokeDasharray="3 3" /> : null}
      <Line x1={x(chosen.x)} x2={x(chosen.x)} y1={TOP} y2={BOTTOM} stroke={c.muted} strokeWidth={1} opacity={0.75} />
      {points.filter(p => p.activity.id !== current.id).map(p => <Circle key={p.activity.id} cx={x(p.x)} cy={y(p.y)} r={p.activity.id === chosen.activity.id ? 6 : 4.5} fill={c.fieldTeal} opacity={p.activity.id === chosen.activity.id ? 1 : .52} />)}
      <Circle cx={x(currentPoint.x)} cy={y(currentPoint.y)} r={10} fill={c.tennis} opacity={.24} /><Circle cx={x(currentPoint.x)} cy={y(currentPoint.y)} r={5.5} fill={c.tennis} stroke={c.ink} strokeWidth={1.75} />
    </ScatterPlot>
    <Legend />
    {fit ? <ChipRow><Chip label={showFit ? "Hide history line" : "Show history line"} selected={showFit} onPress={() => setShowFit(!showFit)} /></ChipRow> : null}
  </View>;
}

function Trajectory({ current, history, units }: { current: Activity; history: Activity[]; units: UnitSystem }) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);
  const clipId = useId();

  const hasEfficiency = efficiencyBaseline(current, history, units) !== null && metricValue(current, "efficiency", units) !== null;
  const defaultMetric = hasEfficiency ? "efficiency" : metricValue(current, "pace", units) !== null ? "pace" : "time";
  const [requestedMetric, setMetric] = useState<Metric>(defaultMetric);
  const [scrubbed, setScrubbed] = useState<ChartDatum | undefined>(undefined);
  const metric = requestedMetric === "efficiency" ? hasEfficiency ? requestedMetric : defaultMetric : metricValue(current, requestedMetric, units) !== null ? requestedMetric : defaultMetric;
  const rows = trajectory(current, history, metric, units);
  const chosen = (scrubbed ? rows.find(row => row.activity.id === scrubbed.id) : undefined) ?? rows.at(-1);
  const currentPoint = rows.find(row => row.activity.id === current.id), previousAverage = rows.filter(row => row.activity.id !== current.id).at(-1)?.average;
  const values = [...rows.map(row => row.value), ...(metric === "efficiency" ? [100] : [])];
  const xd = extent(rows.length ? rows.map(row => row.time) : [Date.parse(current.startedAt)], 86400000);
  const yNice = metric === "pace" ? null : computeNiceAxisTicks(Math.min(...values), Math.max(...values), true);
  const paceDomain = extent(values.length ? values : [0, 1], 12);
  const yd: [number, number] = yNice ? [yNice.yMin, yNice.yMax] : paceDomain;
  const x = scale(xd, LEFT, RIGHT), y = scale(yd, metric === "pace" ? TOP : BOTTOM, metric === "pace" ? BOTTOM : TOP);
  const yTicks = (yNice ? yNice.ticks : paceAxisTicks(paceDomain)).map(value => ({ value, py: y(value) }));
  const averages = rows.filter(row => row.average !== null);
  const metricItems: { id: Metric; label: string }[] = [...(metricValue(current, "pace", units) === null ? [] : [{ id: "pace" as const, label: "Pace" }]), { id: "time", label: "Moving time" }, ...(metricValue(current, "hr", units) !== null ? [{ id: "hr" as const, label: "Heart rate" }] : []), ...(hasEfficiency ? [{ id: "efficiency" as const, label: "Speed / HR" }] : [])];
  const delta = currentPoint?.average !== null && currentPoint?.average !== undefined && previousAverage !== null && previousAverage !== undefined ? currentPoint.average - previousAverage : null;
  const scrubPoints: ChartDatum[] = rows.map(row => ({
    id: row.activity.id,
    x: x(row.time),
    y: y(row.value),
    label: dateLabel(row.activity.startedAt),
    value: formatMetric(row.value, metric, units),
  }));
  const seriesPath = path(rows.map(row => ({ x: x(row.time), y: y(row.value) })));
  const trendPath = averages.length > 1 ? path(averages.map(row => ({ x: x(row.time), y: y(row.average!) }))) : "";
  const latestPoint = scrubPoints.at(-1);
  const xTicks = rows.filter((_, index) => index === 0 || index === Math.floor(rows.length / 2) || index === rows.length - 1).map(row => ({ x: x(row.time), label: dateLabel(row.activity.startedAt) }));
  return <View style={s.concept}>
    <AppText role="heading" accessibilityRole="header">Your recent trajectory</AppText>
    <Choices items={metricItems} value={metric} onChange={next => { setMetric(next); setScrubbed(undefined); }} />
    {chosen ? <Readout value={formatMetric(chosen.value, metric, units)} detail={chosen.average === null ? undefined : `5-session average · ${formatMetric(chosen.average, metric, units)}`} /> : null}
    <ChartScrubber
      hideSummary
      points={scrubPoints}
      width={W}
      height={H}
      plotTop={TOP}
      plotBottom={BOTTOM}
      dotColor={c.tennis}
      dotBorderColor={c.paper}
      label={`Recent ${metric} trajectory. ${chosen ? formatMetric(chosen.value, metric, units) : "No observations"}.`}
      onSelectionChange={setScrubbed}
    >
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {scrubbed ? (
          <Defs>
            <ClipPath id={`${clipId}-left`}><Rect x={0} y={0} width={scrubbed.x} height={H} /></ClipPath>
            <ClipPath id={`${clipId}-right`}><Rect x={scrubbed.x} y={0} width={Math.max(0, W - scrubbed.x)} height={H} /></ClipPath>
          </Defs>
        ) : null}
        <AxesGrid yTicks={yTicks} yFormat={value => metric === "pace" ? formatMetric(value, metric, units).split("/")[0]! : `${Math.round(value)}`} xTicks={xTicks} />
        {metric === "efficiency" ? <Line x1={LEFT} x2={RIGHT} y1={y(100)} y2={y(100)} stroke={c.secondary} strokeDasharray="4 5" opacity={0.5} /> : null}
        {trendPath ? <Path d={trendPath} stroke={c.secondary} fill="none" strokeWidth={1.75} strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {rows.length > 1 ? (
          scrubbed ? <>
            <G clipPath={`url(#${clipId}-left)`}>
              <Path d={seriesPath} stroke={c.tennis} fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </G>
            <G clipPath={`url(#${clipId}-right)`} opacity={0.3}>
              <Path d={seriesPath} stroke={c.tennis} fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </G>
          </> : <Path d={seriesPath} stroke={c.tennis} fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        {!scrubbed && latestPoint ? <Circle cx={latestPoint.x} cy={latestPoint.y} r={4} fill={c.tennis} stroke={c.paper} strokeWidth={1.5} /> : null}
      </Svg>
    </ChartScrubber>
    <Legend line={averages.length > 1} current={false} />
    {delta !== null ? <View style={s.insight}><AppText role="label">The recent average shifts by {delta < 0 ? "−" : "+"}{metric === "pace" ? `${Math.round(Math.abs(delta))} sec/${units === "metric" ? "km" : "mi"}` : metric === "efficiency" ? `${Math.abs(delta).toFixed(1)} points` : formatMetric(Math.abs(delta), metric, units)}</AppText></View> : null}
  </View>;
}

function Ripple({ current, history }: { current: Activity; history: Activity[] }) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);
  const clipId = useId();

  const [scrubbed, setScrubbed] = useState<ChartDatum | undefined>(undefined);
  const days = volumeHistory(current, history), latest = days.at(-1)!, chosen = (scrubbed ? days.find(day => day.key === scrubbed.id) : undefined) ?? latest;
  const maxRaw = Math.max(...days.map(day => day.minutes), 10);
  const yNice = computeNiceAxisTicks(0, maxRaw, true);
  const yd: [number, number] = [yNice.yMin, yNice.yMax];
  const x = (index: number) => LEFT + 6 + index / 27 * (RIGHT - LEFT - 12), y = scale(yd, BOTTOM, TOP);
  const yTicks = yNice.ticks.map(value => ({ value, py: y(value) }));
  const average = latest.average;
  const barWidth = Math.max(4, (RIGHT - LEFT - 12) / 28 * .56);
  const scrubPoints: ChartDatum[] = days.map((day, index) => ({
    id: day.key,
    x: x(index),
    y: y(day.minutes),
    label: dateLabel(day.date),
    value: `${Math.round(day.minutes)} min`,
  }));
  const avgPath = path(days.map((day, index) => ({ x: x(index), y: y(day.average) })));
  const barsAndLine = <>
    {days.map((day, index) => <Rect key={day.key} x={x(index) - barWidth / 2} y={y(day.without)} width={barWidth} height={BOTTOM - y(day.without)} rx={2} fill={c.secondary} opacity={.45} />)}
    <Rect x={x(27) - barWidth / 2} y={y(latest.minutes)} width={barWidth} height={y(latest.without) - y(latest.minutes)} rx={2} fill={c.tennis} />
    <Path d={avgPath} fill="none" stroke={c.fieldTeal} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </>;
  return <View style={s.concept}>
    <AppText role="heading" accessibilityRole="header">What this added</AppText>
    <View style={s.hero}><AppText role="hero">{average.toFixed(1)}</AppText><AppText role="body" secondary>min / day · 7-day average</AppText></View>
    <ChartScrubber
      hideSummary
      hideSelectionDot
      points={scrubPoints}
      width={W}
      height={H}
      plotTop={TOP}
      plotBottom={BOTTOM}
      label={`Logged volume. ${dateLabel(chosen.date)}: ${Math.round(chosen.minutes)} minutes. ${chosen.average.toFixed(1)} minutes per day rolling average on this day.`}
      onSelectionChange={setScrubbed}
    >
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {scrubbed ? (
          <Defs>
            <ClipPath id={`${clipId}-left`}><Rect x={0} y={0} width={scrubbed.x} height={H} /></ClipPath>
            <ClipPath id={`${clipId}-right`}><Rect x={scrubbed.x} y={0} width={Math.max(0, W - scrubbed.x)} height={H} /></ClipPath>
          </Defs>
        ) : null}
        <AxesGrid yTicks={yTicks} yFormat={value => `${Math.round(value)}`} xTicks={[0, 13, 27].map(index => ({ x: x(index), label: dateLabel(days[index]!.date) }))} />
        {scrubbed ? <>
          <G clipPath={`url(#${clipId}-left)`}>{barsAndLine}</G>
          <G clipPath={`url(#${clipId}-right)`} opacity={0.3}>{barsAndLine}</G>
        </> : barsAndLine}
        {!scrubbed ? <Circle cx={x(27)} cy={y(average)} r={4} fill={c.tennis} stroke={c.paper} strokeWidth={1.5} /> : null}
      </Svg>
    </ChartScrubber>
    <View style={s.legend}><AppText role="caption" secondary>Bars · daily minutes</AppText><AppText role="caption" secondary>Line · 7-day average</AppText></View>
    <Readout value={`${Math.round(chosen.minutes)} min recorded`} detail={`7-day average · ${chosen.average.toFixed(1)} min/day`} />
  </View>;
}

const sThemes = createThemedStyles(themeColors=>{const c=themeColors;return {
  sections: { gap: 24 }, surface: { gap: 12, paddingVertical: 24, borderTopWidth: 1, borderColor: c.line },
  concept: { gap: 12 }, readout: { gap: 3 }, hero: { flexDirection: "row", alignItems: "baseline", gap: 10, flexWrap: "wrap" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 16 }, legendItem: { flexDirection: "row", gap: 7, alignItems: "center" },
  dotKey: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.fieldTeal }, lineKey: { width: 19, height: 2, borderRadius: 1, backgroundColor: c.secondary }, currentKey: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.tennis, borderColor: c.ink, borderWidth: 1 },
  insight: { gap: 8, paddingVertical: 16, borderTopWidth: 1, borderColor: c.line },
};});
