import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import {
  buildAnalyticsLabModel,
  type AnalyticsDomainId,
  type CompeteState,
  type VitalId,
} from "@fitness-battle/shared";
import { f } from "../ui/focus";
import { fonts } from "../theme";

const c = {
  ink: "#142b3b",
  card: "#ffffff",
  line: "#e5eae6",
  fieldTeal: "#176c75",
  tennis: "#f7c948",
  statusSuccess: "#24765c",
  muted: "#637482",
};

export function AthleteTelemetryMatrix({
  state: _state,
}: {
  state?: CompeteState;
}) {
  const router = useRouter();
  const model = useMemo(() => buildAnalyticsLabModel("peak_build", "30d"), []);

  const bentoTiles: Array<{
    id: string;
    domain: AnalyticsDomainId;
    kicker: string;
    value: string;
    delta: string;
    points: number[];
    accent: string;
    vitalId?: VitalId;
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
      vitalId: "hrv",
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
        <Text style={f.sectionTitle}>Athlete Telemetry Matrix</Text>

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
              <Text style={s.bentoKicker}>{t.kicker}</Text>
              <View style={s.betweenRow}>
                <Text style={s.bentoValue}>{t.value}</Text>
                <MiniSparkline values={t.points} stroke={t.accent} />
              </View>
              <Text style={f.small} numberOfLines={1}>
                {t.delta}
              </Text>
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
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const W = 58;
  const H = 24;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - min) / span) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Path
        d={`M ${pts}`}
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
  bentoKicker: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: c.muted,
  },
  bentoValue: {
    fontSize: 18,
    fontFamily: fonts.bodyBold,
    color: c.ink,
  },
  betweenRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
