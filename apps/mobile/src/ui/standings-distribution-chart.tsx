import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import {
  raceClock,
  racePercentLabel,
  type StandingsDistribution,
  type StandingsSource,
} from "@fitness-battle/shared";
import { createThemedStyles, useThemeColors, useThemedStyles } from "../theme";
import { AppText } from "./section";

const SOURCE_LABELS: Record<StandingsSource, string> = {
  all: "All data",
  overtaek: "Overtaek",
  published: "Published races",
};

export function StandingsDistributionChart({
  title,
  source,
  distribution,
  loading = false,
  unavailable = false,
  onRetry,
}: {
  title: string;
  source: StandingsSource;
  distribution: StandingsDistribution | null;
  loading?: boolean;
  unavailable?: boolean;
  onRetry?: () => void;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    setSelected(null);
  }, [title, source, distribution?.total]);

  const activeBin =
    selected != null && distribution
      ? distribution.bins.find((b) => b.bucket === selected) ?? null
      : null;

  return (
    <View style={s.card}>
      <View style={s.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText role="caption" secondary>{SOURCE_LABELS[source]}</AppText>
          <AppText role="heading" accessibilityRole="header">{title}</AppText>
        </View>
        {distribution ? (
          <View style={s.countPill}>
            <AppText role="caption" style={s.tabular}>
              {distribution.total.toLocaleString()} {distribution.total === 1 ? "mark" : "marks"}
            </AppText>
          </View>
        ) : null}
      </View>

      {loading && !distribution ? (
        <View style={s.loadingBox}>
          <ActivityIndicator accessibilityLabel="Loading standings distribution" />
        </View>
      ) : unavailable && !distribution ? (
        <View style={s.emptyBox}>
          <AppText role="body" secondary>Distribution unavailable right now.</AppText>
          {onRetry ? (
            <Pressable accessibilityRole="button" onPress={onRetry} style={s.retryBtn}>
              <AppText role="label">Retry</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : !distribution ? (
        <View style={s.emptyBox}>
          <AppText role="body" secondary>
            Sync an activity covering this distance to plot your mark.
          </AppText>
        </View>
      ) : (
        <>
          {/* Key stats strip */}
          <View style={s.statsRow}>
            <View style={s.statCell}>
              <AppText role="caption" secondary>Fastest</AppText>
              <AppText role="label" style={s.tabular}>{raceClock(distribution.fastestMs)}</AppText>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCell}>
              <AppText role="caption" secondary>Median</AppText>
              <AppText role="label" style={s.tabular}>{raceClock(distribution.medianMs)}</AppText>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCell}>
              <AppText role="caption" secondary>Your best</AppText>
              <AppText role="label" style={[s.tabular, distribution.yourTimeMs != null ? { color: c.tennis } : null]}>
                {distribution.yourTimeMs != null ? raceClock(distribution.yourTimeMs) : "—"}
              </AppText>
            </View>
            {distribution.yourPercentile != null ? (
              <>
                <View style={s.statDivider} />
                <View style={s.statCell}>
                  <AppText role="caption" secondary>Faster than</AppText>
                  <AppText role="label" style={[s.tabular, { color: c.green }]}>
                    {racePercentLabel(distribution.yourPercentile)}
                  </AppText>
                </View>
              </>
            ) : null}
          </View>

          {/* Interactive Histogram */}
          <View style={s.plotWrap}>
            <View style={s.barsRow}>
              {distribution.bins.map((bin) => {
                const isSelected = selected === bin.bucket;
                const fill = isSelected
                  ? c.ink
                  : bin.containsUser
                    ? c.tennis
                    : c.accentSecondary;
                return (
                  <Pressable
                    key={bin.bucket}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${bin.label}: ${bin.count.toLocaleString()} ${bin.containsUser ? "(includes your best)" : ""}`}
                    onPress={() => setSelected(isSelected ? null : bin.bucket)}
                    style={s.barCol}
                  >
                    <View
                      style={[
                        s.bar,
                        {
                          height: `${Math.max(bin.count > 0 ? 6 : 0, bin.height)}%`,
                          backgroundColor: fill,
                          opacity: isSelected || bin.containsUser ? 1 : 0.45,
                        },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
            <View style={s.axisRow}>
              <AppText role="caption" secondary style={s.tabular}>
                {raceClock(distribution.minimumMs)}
              </AppText>
              <AppText role="caption" secondary style={s.tabular}>
                {raceClock(distribution.minimumMs + distribution.bins.length * distribution.binWidthMs)}
              </AppText>
            </View>
          </View>

          {/* Active bin readout or legend */}
          <View style={s.readoutRow}>
            <AppText role="caption" secondary style={{ flex: 1 }} accessibilityLiveRegion="polite">
              {activeBin
                ? `${activeBin.label} · ${activeBin.count.toLocaleString()} ${activeBin.count === 1 ? "finish" : "finishes"}${activeBin.containsUser ? " · includes your best" : ""}`
                : distribution.yourTimeMs != null
                  ? "Highlighted bar marks your best · tap any bar to inspect"
                  : "Tap any bar to inspect finish-time range"}
            </AppText>
          </View>

          {/* Percentile cutoffs strip */}
          {distribution.benchmarks ? (
            <View style={s.cutoffsRow}>
              {(
                [
                  ["Top 1%", distribution.benchmarks.top1Ms],
                  ["Top 5%", distribution.benchmarks.top5Ms],
                  ["Top 10%", distribution.benchmarks.top10Ms],
                  ["Top 25%", distribution.benchmarks.top25Ms],
                ] as const
              )
                .filter(([, ms]) => ms != null)
                .map(([label, ms]) => (
                  <View key={label} style={s.cutoffChip}>
                    <AppText role="caption" secondary>{label}</AppText>
                    <AppText role="caption" style={s.tabular}>{raceClock(ms!)}</AppText>
                  </View>
                ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const sThemes = createThemedStyles((c) => ({
  card: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
  },
  loadingBox: {
    height: 170,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    paddingVertical: 28,
    alignItems: "center",
    gap: 10,
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.line,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: c.line,
  },
  plotWrap: {
    gap: 6,
  },
  barsRow: {
    height: 150,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    paddingTop: 6,
  },
  barCol: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  readoutRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cutoffsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cutoffChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
  },
  tabular: {
    fontVariant: ["tabular-nums"],
  },
}));
