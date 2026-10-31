import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Polyline, G, Line } from "react-native-svg";
import {
  SHELL_COLORS as c,
  buildAnalyticsLabModel,
  buildSvgLineGeometry,
  type AnalyticsDomainId,
  type AnalyticsTimeLens,
  type CompeteState,
} from "@fitness-battle/shared";
import { ChartSvg, ChartText } from "../ui/chart-text";
import { AppText } from "../ui/section";

export function AthleteTelemetryMatrix({
  state,
  signedOut = false,
}: {
  state?: CompeteState | null;
  signedOut?: boolean;
}) {
  const router = useRouter();
  const [timeLens, setTimeLens] = useState<AnalyticsTimeLens>("30d");
  const model = useMemo(() => buildAnalyticsLabModel(state, timeLens), [state, timeLens]);

  const SHOW_ATHLETE_EQUITY = false;

  const datesByDomain = {
    market: model.market.equitySeries.map(p => p.label),
    vitals: model.vitals.metrics[0]?.series.map(p => p.label) ?? [],
    sleep: model.sleep.nights.map(p => p.label),
    load: model.load.series.map(p => p.label),
    performance: model.performance.series.map(p => p.label),
    combined: model.combined.series.map(p => p.label),
  };


  const bentoTiles: Array<{
    id: string;
    domain: AnalyticsDomainId;
    kicker: string;
    value: string;
    delta: string;
    points: number[];
    accent: string;
    corridor?: { high: number[]; low: number[] };
  }> = [
    ...(SHOW_ATHLETE_EQUITY
      ? [
          {
            id: "market",
            domain: "market" as const,
            kicker: "Athlete Equity",
            value: signedOut ? "—" : `${model.market.currentIndex.toLocaleString()} pts`,
            delta: signedOut ? "Syncing baseline…" : `+${model.market.allTimeReturnPct}% all-time`,
            points: signedOut ? [1000, 1000] : model.market.equitySeries.map((p) => p.nav),
            accent: c.tennis,
          },
        ]
      : []),
    {
      id: "vitals",
      domain: "vitals" as const,
      kicker: "Overnight HRV",
      value: signedOut ? "—" : (model.vitals.metrics[0]?.formattedCurrent ?? "64 ms"),
      delta: signedOut
        ? "No data"
        : `${model.vitals.metrics[0]?.statusLabel ?? "Normal"} corridor`,
      points: signedOut ? [] : (model.vitals.metrics[0]?.series.map((p) => p.value) ?? []),
      accent: c.tennis,
      corridor: !signedOut && model.vitals.metrics[0]
        ? {
            high: model.vitals.metrics[0].series.map((p) => p.baselineHigh),
            low: model.vitals.metrics[0].series.map((p) => p.baselineLow),
          }
        : undefined,
    },
    {
      id: "sleep",
      domain: "sleep" as const,
      kicker: "Sleep & Debt",
      value: signedOut ? "—" : `${model.sleep.lastNight.score} score`,
      delta: signedOut
        ? "No data"
        : `${model.sleep.lastNight.restorativePct}% restorative · ${model.sleep.lastNight.debtMin}m debt`,
      points: signedOut ? [] : model.sleep.nights.map((n) => n.score),
      accent: c.tennis,
    },
    {
      id: "load",
      domain: "load" as const,
      kicker: "Workload Ratio",
      value: signedOut ? "—" : `${model.load.acwrCurrent.toFixed(2)}x`,
      delta: signedOut ? "No data" : model.load.acwrStatusLabel,
      points: signedOut ? [] : model.load.series.map((b) => b.acwr * 100),
      accent: c.tennis,
    },
    {
      id: "performance",
      domain: "performance" as const,
      kicker: "Aerobic Efficiency",
      value: signedOut ? "—" : model.performance.efCurrent.toFixed(2),
      delta: signedOut
        ? "No data"
        : `${model.performance.efDeltaPct >= 0 ? "+" : ""}${model.performance.efDeltaPct}% pace/HR`,
      points: signedOut ? [] : model.performance.series.map((p) => p.efficiencyFactor),
      accent: c.tennis,
    },
    {
      id: "combined",
      domain: "combined" as const,
      kicker: "Readiness Brief",
      value: signedOut ? "—" : `${model.vitals.readinessComposite}%`,
      delta: signedOut
        ? "No data"
        : `Strain ceiling ${model.combined.optimalStrainCeiling}`,
      points: signedOut ? [] : model.combined.series.map((s) => s.nextDayReadiness),
      accent: c.tennis,
    },
  ];

  return (
    <View style={s.container}>
      <View style={s.betweenRow}>
        <AppText role="heading">Advanced Analytics</AppText>
        <View style={s.lensRow} role="group" accessibilityLabel="Time lens">
          {(["7d", "30d"] as const).map((lens) => {
            const active = timeLens === lens;
            return (
              <Pressable
                key={lens}
                accessibilityRole="button"
                accessibilityLabel={`Time lens ${lens.toUpperCase()}`}
                accessibilityState={{ selected: active }}
                onPress={() => setTimeLens(lens)}
                style={[s.lensPill, active && s.lensPillActive]}
              >
                <AppText role="caption" style={{ color: active ? "#ffffff" : c.muted }}>
                  {lens.toUpperCase()}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={s.bentoGrid}>
        {bentoTiles.map((t) => (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            accessibilityLabel={`${t.kicker}, ${t.value}, ${t.delta}`}
            onPress={() => {
              router.push({
                pathname: "/telemetry",
                params: {
                  domain: t.domain,
                  ...(timeLens !== "30d" ? { lens: timeLens } : {}),
                  signedOut: signedOut ? "1" : undefined,
                },
              } as never);
            }}
            style={s.bentoTile}
          >
            <AppText role="label" secondary numberOfLines={1}>
              {t.kicker}
            </AppText>

            <View style={s.betweenRow}>
              <AppText role="value">{t.value}</AppText>

            </View>

              <MiniSparkline values={t.points} stroke={t.accent} corridor={t.corridor} labels={datesByDomain[t.domain]} />
            <AppText role="caption" secondary numberOfLines={1}>
              {t.delta}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MiniSparkline({
  values,
  stroke,
  labels = [],
  corridor,
}: {
  values: number[];
  stroke: string;
  labels?: string[];
  corridor?: { high: number[]; low: number[] };
}) {
  if (values.length < 2) return null;
  const all = corridor ? [...values, ...corridor.high, ...corridor.low] : values;
  const low = Math.min(...all), high = Math.max(...all);
  const geometry = buildSvgLineGeometry(values, 78, 28, 2, { min: low, max: high });
  const polyline = geometry.polyline;
  const points = geometry.points.map((point, i) => ({ ...point, val: values[i]! }));
  const ticks = [...new Set([low, high])].map(value => ({ value, y: 26 - (value-low)/(high-low || 1)*24 }));
  const number = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : Number(value.toPrecision(3)).toString();
  return (
    <ChartSvg width={110} height={50} viewBox="0 0 110 50">
      {ticks.map(tick => <G key={tick.value}><Line x1={30} x2={104} y1={tick.y} y2={tick.y} stroke={c.line}/><ChartText x={26} y={tick.y+3} textAnchor="end" fill={c.muted}>{number(tick.value)}</ChartText></G>)}
      {labels[0] && <ChartText x={30} y={46} fill={c.muted}>{labels[0]}</ChartText>}
      {labels.at(-1) && <ChartText x={104} y={46} textAnchor="end" fill={c.muted}>{labels.at(-1)}</ChartText>}
      <G transform="translate(28 0)">
{corridor && <Path d={`M ${corridor.high.map((v,i)=>`${2+i/(values.length-1)*74},${26-(v-low)/(high-low||1)*24}`).join(" L ")} L ${corridor.low.map((v,i)=>`${2+i/(values.length-1)*74},${26-(v-low)/(high-low||1)*24}`).reverse().join(" L ")} Z`} fill={stroke} opacity={.16}/>}
{corridor && <Polyline points={corridor.high.map((v,i)=>`${2+i/(values.length-1)*74},${26-(v-low)/(high-low||1)*24}`).join(" ")} fill="none" stroke={stroke} opacity={.65}/>}
      {corridor && <Polyline points={corridor.low.map((v,i)=>`${2+i/(values.length-1)*74},${26-(v-low)/(high-low||1)*24}`).join(" ")} fill="none" stroke={stroke} opacity={.65}/>}
      <Path
        d={`M ${polyline}`}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={1.5} fill={stroke} />
      ))}
      </G>
    </ChartSvg>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 14,
    marginVertical: 4,
  },
  lensRow: {
    flexDirection: "row",
    gap: 6,
  },
  lensPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: "transparent",
  },
  lensPillActive: {
    borderColor: c.fieldTeal,
    backgroundColor: c.fieldTeal,
  },
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  bentoTile: {
    width: "48%",
    backgroundColor: c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.line,
    padding: 12,
    gap: 6,
  },
  betweenRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
