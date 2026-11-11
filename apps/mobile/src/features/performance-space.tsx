import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { useFocusStyles, FocusSegments, FocusSheet } from "../ui/focus";
import { AppText, StatusBadge } from "../ui/section";
import { OpenLineChart } from "../ui/open-line-chart";
import { BenchmarkChart } from "../ui/benchmark-chart";
import { ActivityRoute } from "../ui/activity-route";
import { ChartSvg, ChartText } from "../ui/chart-text";
import { useScoreTrackLens } from "../lib/score-track-lens";
import { useAuth } from "../lib/auth";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Svg, { Rect, G, Line, Path, Circle } from "react-native-svg";
import {
  APP_TIMEZONE,
  RECORD_DISTANCES,
  buildAnalyticsLabModel,
  clubLifetimeTotals,
  competeNow,
  countsOnTrack,
  defaultTrainingSports,
  distanceUnitLabel,
  effortScoreLine,
  formatClockTime,
  formatDistanceM,
  personalRecordChart,
  personalRecordHistory,
  shiftAppDay,
  sportById,
  trainingBuckets,
  weeklyPeriodBounds,
  type Activity,
  type CompeteState,
  type OpenLineRange,
  type RecordAttempt,
  type ScoreTrack,
  type SportId,
  type TrainingRange,
} from "@fitness-battle/shared";

const EFFORT_RANGES: readonly { value: OpenLineRange; label: string }[] = [
  { value: "fourWeeks", label: "1M" },
  { value: "twelveWeeks", label: "3M" },
  { value: "twentyFourWeeks", label: "6M" },
  { value: "year", label: "1Y" },
];

const VOLUME_RANGES: readonly { value: TrainingRange; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export function PerformanceSpace({
  state,
  signedOut = false,
}: {
  state: CompeteState;
  signedOut?: boolean;
}) {
  const c = useThemeColors();
  const f = useFocusStyles();
  const s = useThemedStyles(sThemes);
  const router = useRouter();
  const { user } = useAuth();
  const [defaultTrack] = useScoreTrackLens();

  const [effortRange, setEffortRange] = useState<OpenLineRange>("fourWeeks");
  const [volumeRange, setVolumeRange] = useState<TrainingRange>("week");
  const [selectedSport, setSelectedSport] = useState<SportId | "all">("all");

  // Selected PR distance and inspected PR attempt
  const [selectedPRKey, setSelectedPRKey] = useState<string>("running:5k");
  const [inspectedPRAttempt, setInspectedPRAttempt] = useState<RecordAttempt | null>(null);
  const [inspectedActivity, setInspectedActivity] = useState<Activity | null>(null);

  const now = useMemo(() => competeNow(state), [state]);
  const scope = `${user?.id}:${state.primary}`;
  const [lens, setLens] = useState<{ scope: string; track: ScoreTrack } | null>(null);
  const track = lens?.scope === scope ? lens.track : defaultTrack;

  // Chart models
  const effortChart = useMemo(
    () => effortScoreLine(state, track, effortRange),
    [state, track, effortRange],
  );

  const sportsFilter = useMemo<SportId[]>(() => {
    if (selectedSport === "all") return defaultTrainingSports();
    return [selectedSport];
  }, [selectedSport]);

  const volumeBuckets = useMemo(
    () => trainingBuckets(state.activities, sportsFilter, volumeRange, now, now),
    [state.activities, sportsFilter, volumeRange, now],
  );

  const analyticsModel = useMemo(
    () => buildAnalyticsLabModel(state, "30d"),
    [state],
  );

  // PR Records & Distances
  const allRecords = useMemo(
    () => personalRecordHistory(state, now),
    [state, now],
  );

  const availableDistances = useMemo(() => {
    return (["running", "cycling"] as const).flatMap((sport) =>
      RECORD_DISTANCES[sport]
        .filter((d) =>
          allRecords.some(
            (r) => r.sport === sport && r.distanceId === d.id,
          ),
        )
        .map((d) => ({
          key: `${sport}:${d.id}`,
          label: d.label,
          sport,
          distanceId: d.id,
        })),
    );
  }, [allRecords]);

  const activeDistance = useMemo(() => {
    if (availableDistances.length === 0) return null;
    return (
      availableDistances.find((d) => d.key === selectedPRKey) ??
      availableDistances[0] ??
      null
    );
  }, [availableDistances, selectedPRKey]);

  const activeDistanceRows = useMemo(() => {
    if (!activeDistance) return [];
    return allRecords.filter(
      (r) =>
        r.sport === activeDistance.sport &&
        r.distanceId === activeDistance.distanceId,
    );
  }, [allRecords, activeDistance]);

  const prChartData = useMemo(() => {
    return personalRecordChart(activeDistanceRows, now, 320, 160);
  }, [activeDistanceRows, now]);

  const prSummary = useMemo(() => {
    if (!activeDistanceRows.length) return null;
    const initial = activeDistanceRows[0]!;
    const latest = activeDistanceRows.at(-1)!;
    const dropSeconds = initial.seconds - latest.seconds;
    const pct = initial.seconds > 0 ? (dropSeconds / initial.seconds) * 100 : 0;
    return {
      initial,
      latest,
      dropSeconds,
      pct,
    };
  }, [activeDistanceRows]);

  const formatActivityDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: APP_TIMEZONE,
    });
  };

  // Dynamic athletic insight
  const insightText = useMemo(() => {
    const acwr = analyticsModel.load.acwrCurrent;
    const efDelta = analyticsModel.performance.efDeltaPct;
    if (acwr >= 0.8 && acwr <= 1.3) {
      return `Effort is ${efDelta >= 0 ? "up" : "steady"} with training load in an optimal, progressive adaptation zone.`;
    }
    if (acwr > 1.3) {
      return "Workload ratio is elevated. Maintain consistent aerobic base and prioritize recovery between intense efforts.";
    }
    return "Training load is light. Build consistency with steady base sessions to drive long-term adaptation.";
  }, [analyticsModel]);

  return (
    <View style={s.container}>
      {/* 1. Effort Score Hero Chart */}
      <View style={s.chartCard}>
        <View style={s.chartHeaderRow}>
          <View style={{ gap: 2 }}>
            <AppText role="caption" secondary>
              {track === "verified" ? "GPS Effort Score" : "Open Effort Score"}
            </AppText>
            <View style={s.valueRow}>
              <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                {effortChart.value}
              </AppText>
              <View style={s.trendPill}>
                <AppText role="caption" style={{ color: c.tennis, fontWeight: "700" }}>
                  ↑ +8%
                </AppText>
              </View>
            </View>
            <AppText role="caption" secondary>vs. prior 30d</AppText>
          </View>
        </View>

        {/* Track selector beside date range picker */}
        <View style={s.chartControlsRow}>
          <View style={{ width: 126 }}>
            <FocusSegments
              label="Effort track"
              value={track}
              options={[
                { value: "open", label: "Open" },
                { value: "verified", label: "GPS" },
              ]}
              onChange={(nextTrack) => setLens({ scope, track: nextTrack })}
            />
          </View>

          <View style={{ flex: 1 }}>
            <FocusSegments
              label="Effort time range"
              value={effortRange}
              options={EFFORT_RANGES}
              onChange={setEffortRange}
            />
          </View>
        </View>

        <View style={s.chartBody}>
          <OpenLineChart
            showAxes={true}
            live
            key={`${scope}:${track}:${effortRange}`}
            chart={effortChart}
            label={`${track === "verified" ? "GPS Tracked" : "Open"} effort score history`}
            unit="Effort score"
            range={effortRange}
            onRangeChange={setEffortRange}
            hideSummary={true}
            hideRangeToggle={true}
          />
        </View>
      </View>

      {/* 2. Training Volume Benchmark Chart */}
      <View style={s.chartCard}>
        <View style={s.chartHeaderRow}>
          <View style={{ gap: 2 }}>
            <AppText role="caption" secondary>Training Volume</AppText>
            <View style={s.valueRow}>
              <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                {(volumeBuckets.reduce((sum, b) => sum + b.movingSec, 0) / 3600).toFixed(1)}
              </AppText>
              <AppText role="value" secondary style={{ alignSelf: "flex-end", marginBottom: 4 }}>
                hrs
              </AppText>
            </View>
            <AppText role="caption" secondary>
              {volumeRange === "week" ? "this week" : volumeRange === "month" ? "this month" : "this year"}
            </AppText>
          </View>

          <FocusSegments
            label="Volume time range"
            value={volumeRange}
            options={VOLUME_RANGES}
            onChange={setVolumeRange}
          />
        </View>

        {/* Sport selector chips */}
        <View style={s.sportChipRow}>
          {(["all", "running", "cycling"] as const).map((sport) => {
            const active = selectedSport === sport;
            return (
              <Pressable
                key={sport}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Sport filter ${sport === "all" ? "All" : sportById(sport).name}`}
                onPress={() => setSelectedSport(sport)}
                style={[s.sportPill, active && s.sportPillActive]}
              >
                <AppText
                  role="caption"
                  style={{ color: active ? c.card : c.ink, fontWeight: "600" }}
                >
                  {sport === "all" ? "All Sports" : sportById(sport).name}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <View style={s.chartBody}>
          <BenchmarkChart
            key={`${volumeRange}:${sportsFilter.join(",")}`}
            buckets={volumeBuckets}
            now={now}
            dateLabel={volumeRange}
            hideSummary={true}
          />
        </View>
      </View>

      {/* 3. PR Progression Section */}
      {availableDistances.length > 0 && activeDistance ? (
        <View style={{ gap: 12 }}>
          <View style={s.sectionHeaderRow}>
            <AppText role="heading">PR Progression</AppText>
          </View>

          <View style={s.prCard}>
          {/* Distance Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
          >
            {availableDistances.map((d) => {
              const active = d.key === selectedPRKey;
              return (
                <Pressable
                  key={d.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setSelectedPRKey(d.key);
                    setInspectedPRAttempt(null);
                  }}
                  style={[s.chip, active && s.chipActive]}
                >
                  <AppText
                    role="caption"
                    style={{
                      color: active ? c.card : c.ink,
                      fontWeight: "600",
                    }}
                  >
                    {d.sport === "cycling" ? "Ride · " : "Run · "}
                    {d.label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* PR Headline & Progression Summary */}
          {prSummary ? (
            <View style={{ gap: 12 }}>
              <View style={s.prHeadlineRow}>
                <View style={{ gap: 2 }}>
                  <AppText role="caption" secondary>Current PR</AppText>
                  <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                    {formatClockTime(prSummary.latest.seconds)}
                  </AppText>
                  <AppText role="caption" secondary>
                    {formatActivityDate(prSummary.latest.startedAt)}
                  </AppText>
                </View>

                {prSummary.dropSeconds > 0 && (
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    <AppText role="caption" secondary>Improvement</AppText>
                    <View style={s.gainPill}>
                      <AppText role="caption" style={{ color: c.tennis, fontWeight: "700" }}>
                        -{formatClockTime(prSummary.dropSeconds)} (-{prSummary.pct.toFixed(1)}%)
                      </AppText>
                    </View>
                    <AppText role="caption" secondary>
                      from {formatClockTime(prSummary.initial.seconds)}
                    </AppText>
                  </View>
                )}
              </View>

              {/* Interactive PR Progression Chart */}
              {prChartData && (
                <View style={{ marginVertical: 8 }}>
                  <ChartSvg
                    width="100%"
                    height={160}
                    viewBox={`0 0 ${prChartData.width} ${prChartData.height}`}
                    preserveAspectRatio="none"
                  >
                    {/* X and Y axes lines */}
                    <Line
                      x1={prChartData.left}
                      x2={prChartData.left}
                      y1={prChartData.top}
                      y2={prChartData.bottom}
                      stroke={c.line}
                      strokeWidth={1}
                    />
                    <Line
                      x1={prChartData.left}
                      x2={prChartData.right}
                      y1={prChartData.bottom}
                      y2={prChartData.bottom}
                      stroke={c.line}
                      strokeWidth={1}
                    />

                    {/* Horizontal grid lines & Y-axis labels */}
                    {prChartData.ticks.map((t, idx) => (
                      <G key={`ytick-${t.seconds}-${idx}`}>
                        <Line
                          x1={prChartData.left}
                          x2={prChartData.right}
                          y1={t.y}
                          y2={t.y}
                          stroke={c.line}
                          strokeWidth={0.5}
                          strokeDasharray="3 3"
                        />
                        <ChartText
                          x={prChartData.left - 6}
                          y={t.y + 4}
                          textAnchor="end"
                          fill={c.muted}
                        >
                          {t.label}
                        </ChartText>
                      </G>
                    ))}

                    {/* X-axis labels */}
                    {prChartData.xTicks.map((xt, idx) => (
                      <ChartText
                        key={`xtick-${xt.label}-${idx}`}
                        x={xt.x}
                        y={prChartData.bottom + 16}
                        textAnchor={prChartData.xTicks.length === 1 ? "middle" : idx === 0 ? "start" : "end"}
                        fill={c.muted}
                      >
                        {xt.label}
                      </ChartText>
                    ))}

                    {/* Step path (only rendered if path !== "") */}
                    {prChartData.path ? (
                      <Path
                        d={prChartData.path}
                        fill="none"
                        stroke={c.tennis}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                      />
                    ) : null}

                    {/* Interactive Points */}
                    {prChartData.points.map((p) => {
                      const isInspected =
                        inspectedPRAttempt?.activityId === p.activityId;
                      return (
                        <Circle
                          key={p.activityId}
                          cx={p.x}
                          cy={p.y}
                          r={isInspected ? 7 : 4.5}
                          fill={isInspected ? c.tennis : c.card}
                          stroke={c.tennis}
                          strokeWidth={2.5}
                          onPress={() => {
                            const attempt = activeDistanceRows.find(
                              (r) => r.activityId === p.activityId,
                            );
                            setInspectedPRAttempt(attempt ?? null);
                          }}
                        />
                      );
                    })}
                  </ChartSvg>

                  <AppText role="caption" secondary style={{ textAlign: "center", marginTop: 4 }}>
                    Tap any point along the progression curve to inspect that attempt
                  </AppText>
                </View>
              )}

              {/* Inspected PR Detail Card */}
              {inspectedPRAttempt && (
                <View style={s.inspectedPRBox}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText role="label" style={{ fontWeight: "700" }}>
                      PR on {formatActivityDate(inspectedPRAttempt.startedAt)}
                    </AppText>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <AppText role="value" style={{ fontVariant: ["tabular-nums"] }}>
                        {formatClockTime(inspectedPRAttempt.seconds)}
                      </AppText>
                      <StatusBadge tone={inspectedPRAttempt.verified ? "success" : "neutral"}>
                        {inspectedPRAttempt.verified ? "GPS recorded" : "Manual"}
                      </StatusBadge>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="View workout session"
                    onPress={() => {
                      const found = state.activities.find(
                        (a) => a.id === inspectedPRAttempt.activityId,
                      );
                      if (found) setInspectedActivity(found);
                    }}
                    style={s.inspectActionBtn}
                  >
                    <AppText role="caption" style={{ color: c.card, fontWeight: "600" }}>
                      View activity
                    </AppText>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <AppText role="body" secondary style={{ paddingVertical: 12 }}>
              No record attempts recorded for this distance yet.
            </AppText>
          )}
        </View>
      </View>
      ) : null}

      {/* 4. Key Athletic Insight Card */}
      <View style={s.insightCard}>
        <View style={s.insightIcon}>
          <AppText role="value" style={{ color: c.tennis }}>✦</AppText>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText role="label" style={{ fontWeight: "700" }}>Training Insight</AppText>
          <AppText role="body" secondary style={{ lineHeight: 20 }}>
            {insightText}
          </AppText>
        </View>
      </View>

      {/* Inspect Activity Modal from PR attempt */}
      {inspectedActivity && (
        <FocusSheet
          open={!!inspectedActivity}
          title={inspectedActivity.title || sportById(inspectedActivity.sport).name}
          onClose={() => setInspectedActivity(null)}
        >
          <View style={{ gap: 16, paddingVertical: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <View style={{ gap: 2 }}>
                <AppText role="caption" secondary>Duration</AppText>
                <AppText role="value" style={{ fontVariant: ["tabular-nums"] }}>
                  {formatClockTime(inspectedActivity.movingSec)}
                </AppText>
              </View>
              {inspectedActivity.distanceM > 0 && (
                <View style={{ gap: 2 }}>
                  <AppText role="caption" secondary>Distance</AppText>
                  <AppText role="value" style={{ fontVariant: ["tabular-nums"] }}>
                    {formatDistanceM(inspectedActivity.distanceM, state.units)} {distanceUnitLabel(state.units)}
                  </AppText>
                </View>
              )}
              <View style={{ gap: 2 }}>
                <AppText role="caption" secondary>Effort Earned</AppText>
                <AppText role="value" style={{ color: c.tennis, fontVariant: ["tabular-nums"] }}>
                  {inspectedActivity.effortScore ?? Math.round(inspectedActivity.movingSec / 60)} pts
                </AppText>
              </View>
            </View>

            <ActivityRoute activity={inspectedActivity} units={state.units} />
          </View>
        </FocusSheet>
      )}
    </View>
  );
}

const sThemes = createThemedStyles((themeColors) => {
  const c = themeColors;
  return {
    container: {
      gap: 20,
    },
    chartCard: {
      padding: 16,
      borderRadius: 20,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.line,
      gap: 16,
    },
    prCard: {
      padding: 16,
      borderRadius: 20,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.line,
      gap: 12,
    },
    chartHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    chartControlsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    valueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
      marginVertical: 4,
    },
    trendPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 99,
      backgroundColor: `${c.tennis}22`,
      alignSelf: "center",
    },
    chartBody: {
      marginTop: 4,
    },
    sportChipRow: {
      flexDirection: "row",
      gap: 8,
    },
    sportPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
    },
    sportPillActive: {
      backgroundColor: c.ink,
      borderColor: c.ink,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    textLink: {
      paddingVertical: 4,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
    },
    chipActive: {
      backgroundColor: c.ink,
      borderColor: c.ink,
    },
    prHeadlineRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingVertical: 4,
    },
    gainPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      backgroundColor: `${c.tennis}22`,
    },
    inspectedPRBox: {
      marginTop: 8,
      padding: 12,
      borderRadius: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    inspectActionBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: c.ink,
    },
    insightCard: {
      padding: 16,
      borderRadius: 20,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.line,
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-start",
    },
    insightIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: `${c.tennis}22`,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
  };
});
