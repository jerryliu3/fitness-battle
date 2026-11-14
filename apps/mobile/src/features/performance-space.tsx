import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { FocusSegments } from "../ui/focus";
import { ActivityDetailSheet } from "./activity-detail-sheet";
import { AppText, StatusBadge } from "../ui/section";
import { OpenLineChart } from "../ui/open-line-chart";
import { BenchmarkChart } from "../ui/benchmark-chart";
import { ChartSvg, ChartText } from "../ui/chart-text";
import { ChartScrubber } from "../ui/chart-scrubber";
import { useScoreTrackLens } from "../lib/score-track-lens";
import { useAuth } from "../lib/auth";
import { useId, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { ClipPath, Defs, G, Line, Path, Polyline, Rect } from "react-native-svg";
import {
  APP_TIMEZONE,
  RECORD_DISTANCES,
  competeNow,
  defaultTrainingSports,
  effortScoreComparison,
  effortScoreLine,
  formatClockTime,
  personalRecordChart,
  personalRecordHistory,
  sportById,
  trainingBuckets,
  trainingComparison,
  type Activity,
  type ChartDatum,
  type CompeteState,
  type EffortHistoryRange,
  type RecordAttempt,
  type ScoreTrack,
  type SportId,
  type TrainingRange,
} from "@fitness-battle/shared";

const EFFORT_RANGES: readonly { value: EffortHistoryRange; label: string }[] = [
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
}: {
  state: CompeteState;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);
  const { user } = useAuth();
  const [defaultTrack] = useScoreTrackLens();

  const [effortRange, setEffortRange] = useState<EffortHistoryRange>("fourWeeks");
  const [volumeRange, setVolumeRange] = useState<TrainingRange>("week");
  const [selectedSport, setSelectedSport] = useState<SportId | "all">("all");

  const prClipId = useId();
  // Selected PR distance and inspected PR attempt
  const [selectedPRKey, setSelectedPRKey] = useState<string>("running:5k");
  const [inspectedPRAttempt, setInspectedPRAttempt] = useState<RecordAttempt | null>(null);
  const [scrubbedPRPoint, setScrubbedPRPoint] = useState<ChartDatum | undefined>();
  const [inspectedActivity, setInspectedActivity] = useState<Activity | null>(null);
  const [inspectedEffort, setInspectedEffort] = useState<ChartDatum | undefined>();
  const [inspectedVolume, setInspectedVolume] = useState<{ label: string; value: string } | undefined>();

  const now = useMemo(() => competeNow(state), [state]);
  const scope = `${user?.id}:${state.primary}`;
  const [lens, setLens] = useState<{ scope: string; track: ScoreTrack } | null>(null);
  const track = lens?.scope === scope ? lens.track : defaultTrack;

  // Chart models
  const effortChart = useMemo(
    () => effortScoreLine(state, track, effortRange, now, user?.createdAt),
    [state, track, effortRange, now, user?.createdAt],
  );

  const sportsFilter = useMemo<SportId[]>(() => {
    if (selectedSport === "all") return defaultTrainingSports();
    return [selectedSport];
  }, [selectedSport]);

  const volumeBuckets = useMemo(
    () => trainingBuckets(state.activities, sportsFilter, volumeRange, now, now),
    [state.activities, sportsFilter, volumeRange, now],
  );

  const scoreComparison = useMemo(
    () => effortScoreComparison(state, track, effortRange, now),
    [state, track, effortRange, now],
  );
  const volumeComparison = useMemo(
    () => trainingComparison(state.activities, sportsFilter, volumeRange, now, now),
    [state.activities, sportsFilter, volumeRange, now],
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

  const formatActivityDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: APP_TIMEZONE,
    });
  };

  const prScrubPoints = useMemo<ChartDatum[]>(() => {
    if (!prChartData) return [];
    return prChartData.points.map((p) => ({
      id: p.activityId,
      x: p.x,
      y: p.y,
      label: formatActivityDate(p.startedAt),
      value: formatClockTime(p.seconds),
    }));
  }, [prChartData]);

  const activePRPoint = scrubbedPRPoint
    ?? (inspectedPRAttempt ? prScrubPoints.find((p) => p.id === inspectedPRAttempt.activityId) : undefined);

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

  const insightText = volumeComparison.percent == null
    ? null
    : volumeComparison.label;

  return (
    <View style={s.container}>
      {/* 1. Effort Score Hero Chart */}
      <View style={s.chartCard}>
        <View style={s.chartHeaderRow}>
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <AppText role="caption" secondary>
              {track === "verified" ? "GPS Effort Score" : "Open Effort Score"}
            </AppText>
            <View style={s.valueRow}>
              <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                {inspectedEffort?.value ?? effortChart.value}
              </AppText>
              {scoreComparison && !inspectedEffort && (
                <View style={s.trendPill}>
                  <AppText role="label" style={{ color: c.tennis }}>
                    {scoreComparison.pct > 0 ? "↑ " : scoreComparison.pct < 0 ? "↓ " : ""}
                    {scoreComparison.pct > 0 ? "+" : ""}
                    {scoreComparison.pct.toFixed(0)}%
                  </AppText>
                </View>
              )}
            </View>
            <AppText role="caption" secondary>
              {inspectedEffort?.label
                ?? (scoreComparison
                  ? `vs. start of ${EFFORT_RANGES.find(r => r.value === effortRange)?.label ?? "range"}`
                  : "No prior score in this range")}
            </AppText>
          </View>
          <View style={s.compactControls}>
            <FocusSegments
              label="Effort track"
              value={track}
              options={[
                { value: "open", label: "Open" },
                { value: "verified", label: "GPS" },
              ]}
              onChange={(nextTrack) => setLens({ scope, track: nextTrack })}
            />
            <FocusSegments
              label="Effort time range"
              value={effortRange}
              options={EFFORT_RANGES}
              onChange={(next) => { setEffortRange(next); setInspectedEffort(undefined); }}
            />
          </View>
        </View>

        <View style={s.chartBody}>
          <OpenLineChart
            showAxes={true}
            live
            uniformAspect
            key={`${scope}:${track}:${effortRange}`}
            chart={effortChart}
            label={`${track === "verified" ? "GPS Tracked" : "Open"} effort score history`}
            unit="Effort score"
            range={effortRange}
            onRangeChange={setEffortRange}
            hideSummary={true}
            hideRangeToggle={true}
            onSelectionChange={setInspectedEffort}
          />
        </View>
      </View>

      {/* 2. Training Volume Benchmark Chart */}
      <View style={s.chartCard}>
        <View style={s.chartHeaderRow}>
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <AppText role="caption" secondary>Training Volume</AppText>
            <View style={s.valueRow}>
              <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                {inspectedVolume?.value ?? (volumeBuckets.reduce((sum, b) => sum + b.movingSec, 0) / 3600).toFixed(1)}
              </AppText>
              <AppText role="value" secondary style={{ alignSelf: "flex-end", marginBottom: 4 }}>
                hrs
              </AppText>
            </View>
            <AppText role="caption" secondary>
              {inspectedVolume?.label
                ?? (volumeRange === "week" ? "this week" : volumeRange === "month" ? "this month" : "this year")}
            </AppText>
          </View>
          <View style={s.compactRangeWrap}>
            <FocusSegments
              label="Volume time range"
              value={volumeRange}
              options={VOLUME_RANGES}
              onChange={(next) => { setVolumeRange(next); setInspectedVolume(undefined); }}
            />
          </View>
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
                  style={{ color: active ? c.card : c.ink }}
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
            onSelectionChange={setInspectedVolume}
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
              const active = d.key === activeDistance.key;
              return (
                <Pressable
                  key={d.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setSelectedPRKey(d.key);
                    setInspectedPRAttempt(null);
                    setScrubbedPRPoint(undefined);
                  }}
                  style={[s.chip, active && s.chipActive]}
                >
                  <AppText
                    role="label"
                    style={{
                      color: active ? c.card : c.ink,
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
                  <AppText role="caption" secondary>{activePRPoint ? "Selected PR" : "Current PR"}</AppText>
                  <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                    {activePRPoint?.value ?? formatClockTime(prSummary.latest.seconds)}
                  </AppText>
                  <AppText role="caption" secondary>
                    {activePRPoint?.label ?? formatActivityDate(prSummary.latest.startedAt)}
                  </AppText>
                </View>

                {prSummary.dropSeconds > 0 && (
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    <AppText role="caption" secondary>Improvement</AppText>
                    <View style={s.gainPill}>
                      <AppText role="label" style={{ color: c.tennis }}>
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
                  <ChartScrubber
                    points={prScrubPoints}
                    width={prChartData.width}
                    height={prChartData.height}
                    plotTop={prChartData.top}
                    plotBottom={prChartData.bottom}
                    dotColor={c.tennis}
                    dotBorderColor={c.card}
                    label="Personal record progression"
                    selectedPointId={inspectedPRAttempt?.activityId}
                    hideSummary
                    onSelectionChange={setScrubbedPRPoint}
                    onSelect={(id) => {
                      setInspectedPRAttempt(
                        activeDistanceRows.find((r) => r.activityId === id) ?? null,
                      );
                    }}
                  >
                  <ChartSvg
                    width="100%"
                    height={160}
                    viewBox={`0 0 ${prChartData.width} ${prChartData.height}`}
                    preserveAspectRatio="none"
                  >
                    {activePRPoint && (
                      <Defs>
                        <ClipPath id={`${prClipId}-left`}><Rect x={0} y={0} width={activePRPoint.x} height={prChartData.height} /></ClipPath>
                        <ClipPath id={`${prClipId}-right`}><Rect x={activePRPoint.x} y={0} width={Math.max(0, prChartData.width - activePRPoint.x)} height={prChartData.height} /></ClipPath>
                      </Defs>
                    )}
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

                    {/* Rolling 30-day average trendline */}
                    {prChartData.trendPolyline ? (
                      <Polyline
                        points={prChartData.trendPolyline}
                        fill="none"
                        stroke={c.secondary}
                        strokeWidth={1.75}
                        strokeDasharray="3 3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : null}

                    {/* Step path with right-side dimming when selected */}
                    {prChartData.path ? (
                      activePRPoint ? (
                        <>
                          <G clipPath={`url(#${prClipId}-left)`}>
                            <Path
                              d={prChartData.path}
                              fill="none"
                              stroke={c.tennis}
                              strokeWidth={2.5}
                              strokeLinecap="round"
                            />
                          </G>
                          <G clipPath={`url(#${prClipId}-right)`} opacity={0.3}>
                            <Path
                              d={prChartData.path}
                              fill="none"
                              stroke={c.tennis}
                              strokeWidth={2.5}
                              strokeLinecap="round"
                            />
                          </G>
                        </>
                      ) : (
                        <Path
                          d={prChartData.path}
                          fill="none"
                          stroke={c.tennis}
                          strokeWidth={2.5}
                          strokeLinecap="round"
                        />
                      )
                    ) : null}
                  </ChartSvg>
                  </ChartScrubber>
                </View>
              )}

              {/* Inspected PR Detail Card */}
              {inspectedPRAttempt && (
                <View style={s.inspectedPRBox}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText role="label">
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
                  {state.activities.some((a) => a.id === inspectedPRAttempt.activityId) ? (
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
                    <AppText role="label" style={{ color: c.card }}>
                      View activity
                    </AppText>
                  </Pressable>
                  ) : null}
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

      {insightText ? (
      <View style={s.insightCard}>
        <View style={s.insightIcon}>
          <AppText role="value" style={{ color: c.tennis }}>✦</AppText>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText role="label">Training Insight</AppText>
          <AppText role="body" secondary>
            {insightText}
          </AppText>
        </View>
      </View>
      ) : null}

      <ActivityDetailSheet
        activity={inspectedActivity}
        units={state.units}
        onClose={() => setInspectedActivity(null)}
      />
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
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      gap: 16,
    },
    prCard: {
      padding: 16,
      borderRadius: 20,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      gap: 12,
    },
    chartHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    },
    compactControls: {
      width: 156,
      gap: 8,
      alignSelf: "flex-start",
    },
    compactRangeWrap: {
      width: 156,
      alignSelf: "flex-start",
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
      backgroundColor: c.card,
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
