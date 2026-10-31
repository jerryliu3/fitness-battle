import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path, Circle, G, Line, Text as SvgText } from "react-native-svg";
import {
  SHELL_COLORS as c,
  buildAnalyticsLabModel,
  buildSvgLineGeometry,
  type AnalyticsDomainId,
  type CompeteState,
} from "@fitness-battle/shared";
import { AppText } from "../ui/section";

export function AthleteTelemetryMatrix({
  state,
  signedOut = false,
}: {
  state?: CompeteState | null;
  signedOut?: boolean;
}) {
  const router = useRouter();
  const model = useMemo(() => buildAnalyticsLabModel(state, "30d"), [state]);

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
  }> = [
    ...(SHOW_ATHLETE_EQUITY
      ? [
          {
            id: "market",
            domain: "market" as const,
            kicker: "Athlete Equity",
            value: signedOut ? "—" : `${model.market.currentIndex.toLocaleString()} pts`,
            delta: signedOut ? "No data" : `+${model.market.allTimeReturnPct}% all-time`,
            points: signedOut ? [] : model.market.equitySeries.map((p) => p.nav),
            accent: c.tennis,
          },
        ]
      : []),
    {
      id: "vitals",
      domain: "vitals",
      kicker: "Overnight HRV",
      value: signedOut ? "—" : model.vitals.metrics[0]!.formattedCurrent,
      delta: signedOut ? "No data" : `${model.vitals.metrics[0]!.statusLabel} corridor`,
      points: signedOut ? [] : model.vitals.metrics[0]!.series.map((p) => p.value),
      accent: c.tennis,
    },
    {
      id: "sleep",
      domain: "sleep",
      kicker: "Sleep & Debt",
      value: signedOut ? "—" : `${model.sleep.lastNight.score} score`,
      delta: signedOut ? "No data" : `${model.sleep.lastNight.restorativePct}% restorative · ${model.sleep.lastNight.debtMin}m debt`,
      points: signedOut ? [] : model.sleep.nights.map((n) => n.score),
      accent: c.tennis,
    },
    {
      id: "load",
      domain: "load",
      kicker: "Workload Ratio",
      value: signedOut ? "—" : `${model.load.acwrCurrent.toFixed(2)}x`,
      delta: signedOut ? "No data" : model.load.acwrStatusLabel,
      points: signedOut ? [] : model.load.series.map((b) => b.acwr),
      accent: c.tennis,
    },
    {
      id: "performance",
      domain: "performance",
      kicker: "Aerobic Efficiency",
      value: signedOut ? "—" : model.performance.efCurrent.toFixed(2),
      delta: signedOut ? "No data" : `${model.performance.efDeltaPct >= 0 ? "+" : ""}${model.performance.efDeltaPct}% pace/HR`,
      points: signedOut ? [] : model.performance.series.map((p) => p.efficiencyFactor),
      accent: c.tennis,
    },
    {
      id: "combined",
      domain: "combined",
      kicker: "Readiness Brief",
      value: signedOut ? "—" : `${model.vitals.readinessComposite}%`,
      delta: signedOut ? "No data" : `Strain ceiling ${model.combined.optimalStrainCeiling}`,
      points: signedOut ? [] : model.combined.series.map((s) => s.nextDayReadiness),
      accent: c.tennis,
    },
  ];

  return (
    <View style={s.container}>
      <View style={{ gap: 12 }}>
        <AppText role="heading">Advanced Analytics</AppText>

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
                    signedOut: signedOut ? "1" : undefined,
                  },
                });
              }}
              style={s.bentoTile}
            >
              <AppText role="label" secondary>
                {t.kicker}
              </AppText>
              <View style={s.betweenRow}>
                <AppText role="value">{t.value}</AppText>
              </View>
              <MiniSparkline values={t.points} stroke={t.accent} labels={datesByDomain[t.domain]} />
              <AppText role="caption" secondary numberOfLines={1}>
                {t.delta}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function MiniSparkline({
  values,
  stroke,
  labels = [],
}: {
  values: number[];
  stroke: string;
  labels?: string[];
}) {
  if (values.length < 2) return null;
  const low = Math.min(...values), high = Math.max(...values);
  const geometry = buildSvgLineGeometry(values.map(value => (value - low) / (high - low || 1)), 78, 28, 2);
  const polyline = geometry.polyline;
  const points = geometry.points.map((point, i) => ({ ...point, val: values[i]! }));
  const ticks = [...new Set([low, high])].map(value => ({ value, y: points.find(p => p.val === value)!.y }));
  const number = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : Number(value.toPrecision(3)).toString();
  return (
    <Svg width={110} height={50} viewBox="0 0 110 50">
      {ticks.map(tick => <G key={tick.value}><Line x1={30} x2={104} y1={tick.y} y2={tick.y} stroke={c.line}/><SvgText x={26} y={tick.y+3} fontSize={9} textAnchor="end" fill={c.muted}>{number(tick.value)}</SvgText></G>)}
      {labels[0] && <SvgText x={30} y={46} fontSize={9} fill={c.muted}>{labels[0]}</SvgText>}
      {labels.at(-1) && <SvgText x={104} y={46} fontSize={9} textAnchor="end" fill={c.muted}>{labels.at(-1)}</SvgText>}
      <G transform="translate(28 0)">
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
    </Svg>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 14,
    marginVertical: 4,
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
