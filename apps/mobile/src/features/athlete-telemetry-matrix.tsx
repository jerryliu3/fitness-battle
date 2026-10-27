import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
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
}: {
  state?: CompeteState | null;
}) {
  const router = useRouter();
  const model = useMemo(() => buildAnalyticsLabModel(state, "30d"), [state]);

  const bentoTiles: Array<{
    id: string;
    domain: AnalyticsDomainId;
    kicker: string;
    value: string;
    delta: string;
    points: number[];
    accent: string;
  }> = [
    {
      id: "market",
      domain: "market",
      kicker: "Athlete Equity",
      value: `${model.market.currentIndex.toLocaleString()} pts`,
      delta: `+${model.market.allTimeReturnPct}% all-time`,
      points: model.market.equitySeries.map((p) => p.nav),
      accent: c.tennis,
    },
    {
      id: "vitals",
      domain: "vitals",
      kicker: "Overnight HRV",
      value: model.vitals.metrics[0]!.formattedCurrent,
      delta: `${model.vitals.metrics[0]!.statusLabel} corridor`,
      points: model.vitals.metrics[0]!.series.map((p) => p.value),
      accent: c.fieldTeal,
    },
    {
      id: "sleep",
      domain: "sleep",
      kicker: "Sleep & Debt",
      value: `${model.sleep.lastNight.score} score`,
      delta: `${model.sleep.lastNight.restorativePct}% restorative · ${model.sleep.lastNight.debtMin}m debt`,
      points: model.sleep.nights.map((n) => n.score),
      accent: c.ink,
    },
    {
      id: "load",
      domain: "load",
      kicker: "Workload Ratio",
      value: `${model.load.acwrCurrent.toFixed(2)}x`,
      delta: model.load.acwrStatusLabel,
      points: model.load.series.map((b) => b.acwr * 100),
      accent: c.statusSuccess,
    },
    {
      id: "performance",
      domain: "performance",
      kicker: "Aerobic Efficiency",
      value: model.performance.efCurrent.toFixed(2),
      delta: `${model.performance.efDeltaPct >= 0 ? "+" : ""}${model.performance.efDeltaPct}% pace/HR`,
      points: model.performance.series.map((p) => p.efficiencyFactor * 100),
      accent: c.fieldTeal,
    },
    {
      id: "combined",
      domain: "combined",
      kicker: "Readiness Brief",
      value: `${model.vitals.readinessComposite}%`,
      delta: `Strain ceiling ${model.combined.optimalStrainCeiling}`,
      points: model.combined.series.map((s) => s.nextDayReadiness),
      accent: c.statusSuccess,
    },
  ];

  return (
    <View style={s.container}>
      <View style={{ gap: 12 }}>
        <AppText role="heading">Athlete Telemetry Matrix</AppText>

        <View style={s.bentoGrid}>
          {bentoTiles.map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`${t.kicker}, ${t.value}, ${t.delta}`}
              onPress={() => {
                router.push({
                  pathname: "/telemetry",
                  params: { domain: t.domain },
                });
              }}
              style={s.bentoTile}
            >
              <AppText role="label" secondary>
                {t.kicker}
              </AppText>
              <View style={s.betweenRow}>
                <AppText role="value">{t.value}</AppText>
                <MiniSparkline values={t.points} stroke={t.accent} />
              </View>
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
}: {
  values: number[];
  stroke: string;
}) {
  if (values.length < 2) return null;
  const { polyline } = buildSvgLineGeometry(values, 58, 24, 2);
  return (
    <Svg width={58} height={24} viewBox="0 0 58 24">
      <Path
        d={`M ${polyline}`}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
    flexGrow: 1,
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
