import { useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { sportById, type Activity, type UnitSystem } from "@fitness-battle/shared";
import { AppText, chartTextProps } from "../../ui/section";
import { ScreenHeader } from "../../ui/screen-header";
import { SHELL_COLORS as c } from "../../theme";
import { constellation, dateLabel, example, fitHistory, formatMetric, mean, metricValue, sessionHistory, trajectory, volumeHistory, type Example, type Metric } from "./model";

type Concept = "scatter" | "trend" | "impact";
type Point = { id: string; x: number; y: number };
const concepts: { id: Concept; label: string }[] = [{ id: "scatter", label: "Session map" }, { id: "trend", label: "Trajectory" }, { id: "impact", label: "Ripple effect" }];
const examples: { id: Example; label: string }[] = [{ id: "run", label: "Run + HR" }, { id: "strength", label: "Strength" }, { id: "no-hr", label: "No HR" }, { id: "sparse", label: "Sparse" }];
const H = 282, TOP = 20, BOTTOM = H - 46, LEFT = 54;
const path = (points: { x: number; y: number }[]) => points.map((point, i) => `${i ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
function extent(values: number[], minimumPadding = 1): [number, number] {
  const min = Math.min(...values), max = Math.max(...values), padding = Math.max(minimumPadding, (max - min) * .16);
  return [min - padding, max + padding];
}
function scale(domain: [number, number], low: number, high: number) {
  return (value: number) => low + (value - domain[0]) / (domain[1] - domain[0] || 1) * (high - low);
}

export default function ActivityContextLab() {
  const router = useRouter();
  const params = useLocalSearchParams<{ concept?: Concept; sample?: Example }>();
  const [concept, setConcept] = useState<Concept>(concepts.some(item => item.id === params.concept) ? params.concept! : "scatter");
  const [sample, setSample] = useState<Example>(examples.some(item => item.id === params.sample) ? params.sample! : "run");
  const [focused, setFocused] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const data = useMemo(() => example(sample), [sample]);
  const history = useMemo(() => sessionHistory(data.current, data.history, new Date(data.current.startedAt)), [data]);
  return <SafeAreaView style={s.safe}>
    <ScreenHeader title="Activity context lab" onBack={() => router.canGoBack() ? router.back() : router.replace("/today")} />
    <ScrollView ref={scroll} contentContainerStyle={s.page}>
      <View style={s.previewControls}><AppText role="caption" secondary>FICTIONAL HISTORY</AppText><Pressable style={s.choice} accessibilityRole="button" onPress={() => { setFocused(!focused); scroll.current?.scrollTo({ y: 0, animated: false }); }}><AppText role="label">{focused ? "Show examples" : "Focus chart"}</AppText></Pressable></View>
      {!focused ? <Choices items={examples} value={sample} onChange={setSample} label="Example activity" /> : null}
      <Choices items={concepts} value={concept} onChange={setConcept} label="Activity context concept" />
      {!focused ? <View style={s.activity}><AppText role="label">{sportById(data.current.sport).name} · {dateLabel(data.current.startedAt)}</AppText><AppText role="caption" secondary>{data.current.sport === "running" ? "5.1 mi · 44:00" : "44:00 · recorded duration"}</AppText></View> : null}
      <View key={`${sample}-${concept}`}>
        {concept === "scatter" ? <Constellation current={data.current} history={history} units={data.units} onTrend={() => setConcept("trend")} />
          : concept === "trend" ? <Trajectory current={data.current} history={history} units={data.units} />
            : <Ripple current={data.current} history={history} />}
      </View>
      {!focused ? <View style={s.evaluation}><AppText role="label">Why this belongs on an activity</AppText><AppText role="body" secondary>{concept === "scatter" ? "See this session among similar efforts, then tap another dot to inspect it. Your own distribution provides the context." : concept === "trend" ? "See the selected session at the end of a real sequence, and how including it changes the recent average." : "Isolate this one session's contribution. The history stays fixed while you include or exclude the selected activity."}</AppText></View> : null}
    </ScrollView>
  </SafeAreaView>;
}

function Choices<T extends string>({ items, value, onChange, label }: { items: readonly { id: T; label: string }[]; value: T; onChange: (value: T) => void; label: string }) {
  return <View style={s.choices} accessibilityLabel={label}>{items.map(item => <Pressable accessibilityRole="button" accessibilityState={{ selected: item.id === value }} accessibilityLabel={item.label} key={item.id} onPress={() => onChange(item.id)} style={[s.choice, item.id === value && s.selected]}><AppText role="label" style={item.id === value ? s.selectedText : undefined}>{item.label}</AppText></Pressable>)}</View>;
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

function Grid({ width, yDomain, yFormat, xTicks, xLabel }: { width: number; yDomain: [number, number]; yFormat: (value: number) => string; xTicks: { x: number; label: string }[]; xLabel: string }) {
  const y = scale(yDomain, BOTTOM, TOP);
  return <>{Array.from({ length: 4 }, (_, i) => yDomain[0] + (yDomain[1] - yDomain[0]) * i / 3).map(value => <ViewlessGrid key={value} value={value} py={y(value)} width={width} label={yFormat(value)} />)}
    {xTicks.map((tick, index) => <SvgText key={`${tick.x}-${index}`} x={tick.x} y={BOTTOM + 21} fill={c.muted} {...chartTextProps()} textAnchor={index === 0 ? "start" : index === xTicks.length - 1 ? "end" : "middle"}>{tick.label}</SvgText>)}
    <SvgText x={(LEFT + width - 16) / 2} y={H - 3} textAnchor="middle" fill={c.muted} {...chartTextProps()}>{xLabel}</SvgText>
  </>;
}
function ViewlessGrid({ py, width, label }: { value: number; py: number; width: number; label: string }) { return <><Line x1={LEFT} x2={width - 16} y1={py} y2={py} stroke={c.line} strokeWidth={1} /><SvgText x={LEFT - 8} y={py + 4} textAnchor="end" fill={c.muted} {...chartTextProps()}>{label}</SvgText></>; }
function Legend({ line = false, current = true }: { line?: boolean; current?: boolean }) { return <View style={s.legend}><View style={s.legendItem}><View style={line ? s.lineKey : s.dotKey} /><AppText role="caption" secondary>{line ? "5-session average" : "Earlier sessions"}</AppText></View>{current && <View style={s.legendItem}><View style={s.currentKey} /><AppText role="caption" secondary>This session</AppText></View>}</View>; }
function Readout({ title, value, detail }: { title: string; value: string; detail?: string }) { return <View style={s.readout} accessibilityLiveRegion="polite"><AppText role="label">{title}</AppText><AppText role="metric">{value}</AppText>{detail ? <AppText role="caption" secondary>{detail}</AppText> : null}</View>; }

function Constellation({ current, history, units, onTrend }: { current: Activity; history: Activity[]; units: UnitSystem; onTrend: () => void }) {
  const [width, setWidth] = useState(330), [selected, setSelected] = useState(current.id), [showFit, setShowFit] = useState(true);
  const points = constellation(current, history, units), currentPoint = points.find(p => p.activity.id === current.id);
  const metric = current.sport === "strength" ? "time" : "pace";
  const fit = fitHistory(points, current.id);
  if (!currentPoint || points.length < 4) return <View style={s.concept}><AppText role="display">Every session has a place.</AppText><AppText role="body" secondary>{!currentPoint ? "This session has no recorded heart rate. A pace–HR scatterplot needs both measurements." : "There are only a few earlier sessions with both measurements. A relationship line would be premature."}</AppText><Pressable accessibilityRole="button" onPress={onTrend} style={s.action}><AppText role="label">Explore the session trajectory</AppText></Pressable></View>;
  const chosen = points.find(point => point.activity.id === selected) ?? currentPoint;
  const fitValues = fit ? [fit.intercept + fit.slope * fit.min, fit.intercept + fit.slope * fit.max] : [];
  const xd = extent(points.map(p => p.x), 3), yd = extent([...points.map(p => p.y), ...fitValues], metric === "pace" ? 12 : 3);
  const x = scale(xd, LEFT, width - 16), y = scale(yd, metric === "pace" ? TOP : BOTTOM, metric === "pace" ? BOTTOM : TOP);
  const renderY = metric === "pace" ? ([yd[1], yd[0]] as [number, number]) : yd;
  const ticks = [xd[0], mean(xd), xd[1]].map(value => ({ x: x(value), label: `${Math.round(value)}` }));
  return <View style={s.concept} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <AppText role="heading">{metric === "pace" ? "Pace × heart rate" : "Duration × heart rate"}</AppText>
    <AppText role="body" secondary>{points.length - 1} earlier {current.sport} sessions{metric === "pace" ? " within 20% of this distance" : " with recorded heart rate"} · last 90 days</AppText>
    <Readout title={chosen.activity.id === current.id ? "This session" : dateLabel(chosen.activity.startedAt)} value={formatMetric(chosen.y, metric, units)} detail={`${chosen.x} bpm average · ${Math.round(chosen.activity.movingSec / 60)} min`} />
    <AppText role="caption" secondary>{metric === "pace" ? "Session pace · min/mi · faster at top" : "Recorded duration · min"}</AppText>
    <Plot width={width} points={points.map(p => ({ id: p.activity.id, x: x(p.x), y: y(p.y) }))} selected={chosen.activity.id} onSelect={setSelected} label={`Session scatterplot. ${formatMetric(chosen.y, metric, units)} at ${chosen.x} bpm. ${chosen.activity.id === current.id ? "Current session." : dateLabel(chosen.activity.startedAt)}`}>
      <Grid width={width} yDomain={renderY} yFormat={value => metric === "pace" ? formatMetric(value, metric, units).split("/")[0]! : `${Math.round(value)}`} xTicks={ticks} xLabel="Average heart rate · bpm" />
      {showFit && fit ? <Line x1={x(fit.min)} x2={x(fit.max)} y1={y(fit.intercept + fit.slope * fit.min)} y2={y(fit.intercept + fit.slope * fit.max)} stroke={c.secondary} strokeWidth={2} strokeDasharray="5 5" /> : null}
      <Line x1={x(chosen.x)} x2={x(chosen.x)} y1={TOP} y2={BOTTOM} stroke={c.line} strokeWidth={1} />
      {points.filter(p => p.activity.id !== current.id).map(p => <Circle key={p.activity.id} cx={x(p.x)} cy={y(p.y)} r={p.activity.id === chosen.activity.id ? 7 : 5} fill={c.fieldTeal} opacity={p.activity.id === chosen.activity.id ? 1 : .52} />)}
      <Circle cx={x(currentPoint.x)} cy={y(currentPoint.y)} r={12} fill={c.tennis} opacity={.24} /><Circle cx={x(currentPoint.x)} cy={y(currentPoint.y)} r={7} fill={c.tennis} stroke={c.ink} strokeWidth={2} />
    </Plot>
    <Legend />
    <View style={s.choices}><Pressable style={s.choice} accessibilityRole="button" onPress={() => setSelected(current.id)}><AppText role="label">Focus this session</AppText></Pressable>{fit ? <Pressable style={s.choice} accessibilityRole="button" accessibilityState={{ selected: showFit }} onPress={() => setShowFit(!showFit)}><AppText role="label">{showFit ? "Hide" : "Show"} history line</AppText></Pressable> : null}</View>
    <AppText role="caption" secondary>Tap a dot to inspect. The dashed line describes earlier observations. Route, conditions and workout intent are not matched; this is not a fitness score.</AppText>
  </View>;
}

function Trajectory({ current, history, units }: { current: Activity; history: Activity[]; units: UnitSystem }) {
  const [metric, setMetric] = useState<Metric>(current.sport === "strength" ? "time" : "pace"), [included, setIncluded] = useState(true), [selected, setSelected] = useState(current.id), [width, setWidth] = useState(330);
  const rows = trajectory(current, history, metric, units), chosen = rows.find(row => row.activity.id === selected) ?? rows.at(-1);
  const currentPoint = rows.find(row => row.activity.id === current.id), previousAverage = rows.filter(row => row.activity.id !== current.id).at(-1)?.average;
  const values = rows.map(row => row.value), xd = extent(rows.map(row => row.time), 86400000), yd = extent(values.length ? values : [0, 1], metric === "pace" ? 12 : 3);
  const x = scale(xd, LEFT, width - 16), y = scale(yd, metric === "pace" ? TOP : BOTTOM, metric === "pace" ? BOTTOM : TOP);
  const renderY = metric === "pace" ? ([yd[1], yd[0]] as [number, number]) : yd;
  const active = rows.filter(row => included || row.activity.id !== current.id), averages = active.filter(row => row.average !== null);
  const metricItems: { id: Metric; label: string }[] = [...(current.sport === "strength" ? [] : [{ id: "pace" as const, label: "Pace" }]), { id: "time", label: "Moving time" }, ...(metricValue(current, "hr", units) !== null ? [{ id: "hr" as const, label: "Heart rate" }] : [])];
  const delta = currentPoint?.average !== null && currentPoint?.average !== undefined && previousAverage !== null && previousAverage !== undefined ? currentPoint.average - previousAverage : null;
  return <View style={s.concept} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <AppText role="heading">Your recent trajectory</AppText>
    <AppText role="body" secondary>Recent {current.sport} sessions{metric === "pace" ? " at similar distances" : ""}, with a 5-session moving average.</AppText>
    <Choices items={metricItems} value={metric} onChange={next => { setMetric(next); setSelected(current.id); }} label="Trajectory measure" />
    {chosen ? <Readout title={chosen.activity.id === current.id ? "This session" : dateLabel(chosen.activity.startedAt)} value={formatMetric(chosen.value, metric, units)} detail={!included && chosen.activity.id === current.id ? previousAverage === null || previousAverage === undefined ? "Excluded from the recent average" : `Excluded · preceding average ${formatMetric(previousAverage, metric, units)}` : chosen.average === null ? "Fewer than 5 observations at this point" : `5-session average · ${formatMetric(chosen.average, metric, units)}`} /> : null}
    <Choices items={[{ id: "without", label: "Without this session" }, { id: "with", label: "With this session" }]} value={included ? "with" : "without"} onChange={value => setIncluded(value === "with")} label="Include selected activity" />
    <AppText role="caption" secondary>{metric === "pace" ? "Session pace · min/mi · faster at top" : metric === "time" ? "Moving time · minutes" : "Average heart rate · bpm"}</AppText>
    <Plot width={width} points={rows.map(row => ({ id: row.activity.id, x: x(row.time), y: y(row.value) }))} selected={chosen?.activity.id ?? current.id} onSelect={setSelected} label={`Recent ${metric} trajectory. ${chosen ? formatMetric(chosen.value, metric, units) : "No observations"}. ${included ? "Including" : "Excluding"} selected session from average.`}>
      <Grid width={width} yDomain={renderY} yFormat={value => metric === "pace" ? formatMetric(value, metric, units).split("/")[0]! : `${Math.round(value)}`} xTicks={[rows[0], rows[Math.floor(rows.length / 2)], rows.at(-1)].filter((row): row is NonNullable<typeof row> => Boolean(row)).map(row => ({ x: x(row.time), label: dateLabel(row.activity.startedAt) }))} xLabel="Session date" />
      {averages.length > 1 ? <Path d={path(averages.map(row => ({ x: x(row.time), y: y(row.average!) })))} stroke={c.fieldTeal} fill="none" strokeWidth={3} /> : null}
      {chosen ? <Line x1={x(chosen.time)} x2={x(chosen.time)} y1={TOP} y2={BOTTOM} stroke={c.line} strokeWidth={1} /> : null}
      {rows.map(row => <Circle key={row.activity.id} cx={x(row.time)} cy={y(row.value)} r={row.activity.id === current.id ? 7 : row.activity.id === chosen?.activity.id ? 6 : 4} fill={row.activity.id === current.id ? included ? c.tennis : c.paper : c.secondary} stroke={row.activity.id === current.id ? c.ink : c.paper} strokeWidth={row.activity.id === current.id ? 2 : 1} opacity={row.activity.id === current.id ? 1 : .7} />)}
      {included && currentPoint?.average !== null && currentPoint?.average !== undefined ? <Circle cx={x(currentPoint.time)} cy={y(currentPoint.average)} r={5} fill={c.fieldTeal} /> : null}
    </Plot>
    <Legend line={averages.length > 1} />
    {delta !== null ? <View style={s.insight}><AppText role="label">The recent average shifts by {delta < 0 ? "−" : "+"}{metric === "pace" ? `${Math.round(Math.abs(delta))} sec/mi` : formatMetric(Math.abs(delta), metric, units)}</AppText><AppText role="caption" secondary>{formatMetric(previousAverage!, metric, units)} → {formatMetric(currentPoint!.average!, metric, units)}. This session enters the 5-session window and its oldest session rolls out.</AppText></View> : <AppText role="caption" secondary>The moving average needs 5 observations; a before/after change needs 5 earlier sessions plus this one.</AppText>}
    <AppText role="caption" secondary>Dots are individual sessions; the line is the mean of each five-session window, not a forecast. Pace comparisons use distances within 20% of this session.</AppText>
  </View>;
}

function Ripple({ current, history }: { current: Activity; history: Activity[] }) {
  const [included, setIncluded] = useState(true), [selected, setSelected] = useState<string | null>(null), [width, setWidth] = useState(330);
  const days = volumeHistory(current, history), latest = days.at(-1)!, chosen = days.find(day => day.key === selected) ?? latest;
  const max = Math.max(...days.map(day => day.minutes), 10) * 1.15, yd: [number, number] = [0, max];
  const x = (index: number) => LEFT + 6 + index / 27 * (width - LEFT - 28), y = scale(yd, BOTTOM, TOP);
  const average = included ? latest.average : latest.averageWithout;
  return <View style={s.concept} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <AppText role="heading">This session's contribution</AppText>
    <AppText role="body" secondary>Daily recorded {current.sport} time and its 7-day average, through this activity.</AppText>
    <View style={s.hero}><AppText role="hero">{average.toFixed(1)}</AppText><AppText role="body" secondary>min / day · 7-day average</AppText></View>
    <Choices items={[{ id: "without", label: "Without this session" }, { id: "with", label: "With this session" }]} value={included ? "with" : "without"} onChange={value => setIncluded(value === "with")} label="Include selected activity in volume" />
    <AppText role="caption" secondary>Recorded minutes / day</AppText>
    <Plot width={width} points={days.map((day, index) => ({ id: day.key, x: x(index), y: y(included ? day.minutes : day.without) }))} selected={chosen.key} onSelect={setSelected} label={`Logged volume. ${dateLabel(chosen.date)}: ${Math.round(included ? chosen.minutes : chosen.without)} minutes. ${(included ? chosen.average : chosen.averageWithout).toFixed(1)} minutes per day rolling average on this day.`}>
      <Grid width={width} yDomain={yd} yFormat={value => `${Math.round(value)}`} xTicks={[0, 13, 27].map(index => ({ x: x(index), label: dateLabel(days[index]!.date) }))} xLabel="Day · America/New_York" />
      {days.map((day, index) => <Rect key={day.key} x={x(index) - Math.max(2, (width - LEFT - 28) / 28 * .28)} y={y(day.without)} width={Math.max(4, (width - LEFT - 28) / 28 * .56)} height={BOTTOM - y(day.without)} rx={2} fill={c.secondary} opacity={.45} />)}
      {included ? <Rect x={x(27) - Math.max(2, (width - LEFT - 28) / 28 * .28)} y={y(latest.minutes)} width={Math.max(4, (width - LEFT - 28) / 28 * .56)} height={y(latest.without) - y(latest.minutes)} rx={2} fill={c.tennis} /> : null}
      <Path d={path(days.map((day, index) => ({ x: x(index), y: y(included ? day.average : day.averageWithout) })))} fill="none" stroke={c.fieldTeal} strokeWidth={3} />
      <Line x1={x(days.indexOf(chosen))} x2={x(days.indexOf(chosen))} y1={TOP} y2={BOTTOM} stroke={c.ink} strokeWidth={1} opacity={.25} />
      <Circle cx={x(27)} cy={y(average)} r={5} fill={c.tennis} stroke={c.ink} strokeWidth={2} />
    </Plot>
    <View style={s.legend}><AppText role="caption" secondary>Bars · daily minutes</AppText><AppText role="caption" secondary>Line · 7-day average</AppText></View>
    <Readout title={dateLabel(chosen.date)} value={`${Math.round(included ? chosen.minutes : chosen.without)} min recorded`} detail={`7-day average · ${(included ? chosen.average : chosen.averageWithout).toFixed(1)} min/day`} />
    <View style={s.insight}><AppText role="label">This session adds {(current.movingSec / 60).toFixed(0)} min to logged volume</AppText><AppText role="caption" secondary>Its arithmetic effect on the 7-day average is +{(latest.average - latest.averageWithout).toFixed(1)} min/day. This is a volume measure, not training strain or recovery.</AppText></View>
    <AppText role="caption" secondary>Unlogged days count as zero recorded minutes. Today's total stops at this session; later activity is excluded. No fitness, injury-risk or readiness conclusion is inferred.</AppText>
  </View>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.paper }, page: { paddingHorizontal: 22, paddingBottom: 50, gap: 20, width: "100%", maxWidth: 620, alignSelf: "center" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  previewControls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 8 },
  choice: { minHeight: 44, justifyContent: "center", paddingHorizontal: 13, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: c.line },
  selected: { backgroundColor: c.ink, borderColor: c.ink }, selectedText: { color: c.card },
  activity: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line, paddingVertical: 14, gap: 4 },
  concept: { gap: 16 }, readout: { gap: 4, minHeight: 86 }, hero: { flexDirection: "row", alignItems: "baseline", gap: 10, flexWrap: "wrap" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 16 }, legendItem: { flexDirection: "row", gap: 7, alignItems: "center" },
  dotKey: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.fieldTeal }, lineKey: { width: 19, height: 3, borderRadius: 2, backgroundColor: c.fieldTeal }, currentKey: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.tennis, borderColor: c.ink, borderWidth: 1 },
  insight: { gap: 8, paddingVertical: 16, borderTopWidth: 1, borderColor: c.line },
  evaluation: { gap: 10, paddingTop: 20, borderTopWidth: 1, borderColor: c.line },
  action: { minHeight: 48, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.tennis, alignItems: "center" },
});
