import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Path, Polyline, G } from "react-native-svg";
import { buildAnalyticsLabModel, buildSvgLineGeometry, type AnalyticsDomainId, type AnalyticsTimeLens, type CompeteState } from "@fitness-battle/shared";
import { ChartSvg } from "../ui/chart-text";
import { FocusSegments } from "../ui/focus";
import { AppText } from "../ui/section";

export function AthleteTelemetryMatrix({
  state,
  signedOut = false,
}: {
  state?: CompeteState | null;
  signedOut?: boolean;
}) {
const c=useThemeColors();
const s=useThemedStyles(sThemes);

  const router = useRouter();
  const [timeLens, setTimeLens] = useState<AnalyticsTimeLens>("30d");
  const model = useMemo(() => buildAnalyticsLabModel(state, timeLens), [state, timeLens]);

  const SHOW_ATHLETE_EQUITY = false;

  const bentoTiles: Array<{
    id: string;
    domain: AnalyticsDomainId;
    kicker: string;
    value: string;
    delta: string;
    points: number[];
    accent: string;
    corridor?: { high: number[]; low: number[] };
    hero?: boolean;
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
      hero: true,
    },
  ];

  return (
    <View style={s.container}>
      <View style={s.betweenRow}>
        <AppText role="heading">Advanced Analytics</AppText>
        <FocusSegments
          compact
          label="Time lens"
          value={timeLens}
          options={[
            { value: "7d", label: "7D", accessibilityLabel: "Time lens 7D" },
            { value: "30d", label: "30D", accessibilityLabel: "Time lens 30D" },
          ]}
          onChange={setTimeLens}
        />
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
            style={[s.bentoTile, t.hero && s.bentoTileHero]}
          >
            <AppText role="label" secondary numberOfLines={1}>
              {t.kicker}
            </AppText>

            <View style={s.betweenRow}>
              <AppText role="value">{t.value}</AppText>

            </View>

              <MiniSparkline values={t.points} stroke={t.accent} corridor={t.corridor} />
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
  corridor,
}: {
  values: number[];
  stroke: string;
  corridor?: { high: number[]; low: number[] };
}) {
  const c = useThemeColors();
  if (values.length < 2) return null;
  const all = corridor ? [...values, ...corridor.high, ...corridor.low] : values;
  const low = Math.min(...all), high = Math.max(...all);
  const geometry = buildSvgLineGeometry(values, 78, 28, 2, { min: low, max: high });
  const polyline = geometry.polyline;
  const points = geometry.points.map((point, i) => ({ ...point, val: values[i]! }));
  const yAt = (v: number) => 26 - ((v - low) / (high - low || 1)) * 24;
  const xAt = (i: number) => 2 + (i / (values.length - 1)) * 74;
  const trendPolyline = !corridor
    ? points
        .map((_, i) => {
          const startIdx = Math.max(0, i - 29);
          const slice = values.slice(startIdx, i + 1);
          const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
          return `${xAt(i).toFixed(1)},${yAt(avg).toFixed(1)}`;
        })
        .join(" ")
    : "";
  return (
    <ChartSvg width="100%" height={40} viewBox="0 0 82 32">
      <G transform="translate(2 2)">
      {corridor && <Path d={`M ${corridor.high.map((v,i)=>`${xAt(i)},${yAt(v)}`).join(" L ")} L ${corridor.low.map((v,i)=>`${xAt(i)},${yAt(v)}`).reverse().join(" L ")} Z`} fill={stroke} opacity={.16}/>}
      {corridor && <Polyline points={corridor.high.map((v,i)=>`${xAt(i)},${yAt(v)}`).join(" ")} fill="none" stroke={stroke} strokeDasharray={[2, 2]} opacity={.65}/>}
      {corridor && <Polyline points={corridor.low.map((v,i)=>`${xAt(i)},${yAt(v)}`).join(" ")} fill="none" stroke={stroke} strokeDasharray={[2, 2]} opacity={.65}/>}
      {corridor ? (
        points.map((p, i) => {
          const out = p.val < (corridor.low[i] ?? p.val) || p.val > (corridor.high[i] ?? p.val);
          return (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={1.75}
              fill={out ? c.card : stroke}
              stroke={out ? stroke : "none"}
              strokeWidth={out ? 1.2 : 0}
              strokeDasharray={out ? "1.5 1.5" : undefined}
            />
          );
        })
      ) : (
        <>
          {!!trendPolyline && (
            <Polyline
              points={trendPolyline}
              fill="none"
              stroke={c.secondary}
              strokeWidth={1.25}
              strokeDasharray="2 2"
              strokeLinecap="round"
            />
          )}
          <Path
            d={`M ${polyline}`}
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.at(-1) && (
            <Circle
              cx={points.at(-1)!.x}
              cy={points.at(-1)!.y}
              r={2}
              fill={stroke}
            />
          )}
        </>
      )}
      </G>
    </ChartSvg>
  );
}

const sThemes = createThemedStyles(themeColors=>{const c=themeColors;return {
  container: {
    gap: 14,
    marginVertical: 4,
  },
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
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
  bentoTileHero: {
    width: "100%",
  },
  betweenRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
};});
