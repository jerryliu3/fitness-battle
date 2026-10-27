import { SectionStack, AppText, SectionHeader } from "../ui/section";
import { Achievements } from "./club-achievements";
import { WeekRecap } from "./club-week-recap";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCompeteStore } from "../lib/compete-store";
import { FocusSegments, f } from "../ui/focus";
import { AwardShelf } from "../ui/award-shelf";
import Svg, { Rect, Line } from "react-native-svg";
import {
  awardCards,
  formatVolume,
  formatEffort,
  sportById,
  weeklyBoard,
  competeNow,
  trainingBuckets,
  trainingComparison,
  personalRecordHistory,
  formatClockTime,
  RECORD_DISTANCES,
  type TrainingRange,
} from "@fitness-battle/shared";
import { AthleteMetrics } from "./athlete-metrics";
import { TrainingAtlas } from "./training-atlas";
import { useScoreTrackLens } from "../lib/score-track-lens";
import { SHELL_COLORS as c } from "../theme";

const getRecordLabel = (r: { sport: "running" | "cycling"; distanceId: string }) =>
  RECORD_DISTANCES[r.sport].find((d) => d.id === r.distanceId)?.label ?? r.distanceId;

function DeltaCard({
  title,
  value,
  previous,
  note,
  onPress,
}: {
  title: string;
  value: string;
  previous: number;
  note: string;
  onPress?: () => void;
}) {
  const currentNum = Number(value) || 0;
  const maxVal = Math.max(1, currentNum, previous);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${value}, ${note}`}
      style={[
        f.card,
        {
          flex: 1,
          minWidth: 0,
          padding: 16,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: 20,
          gap: 6,
        },
      ]}
    >
      <AppText role="label">{title}</AppText>
      <AppText role="display">{value}</AppText>
      <View style={{ gap: 4, marginVertical: 4 }}>
        <View style={{ height: 5, borderRadius: 3, backgroundColor: c.line, overflow: "hidden" }}>
          <View
            style={{
              width: `${Math.min(100, (currentNum / maxVal) * 100)}%`,
              height: 5,
              borderRadius: 3,
              backgroundColor: c.tennis,
            }}
          />
        </View>
        <View style={{ height: 5, borderRadius: 3, backgroundColor: c.line, overflow: "hidden" }}>
          <View
            style={{
              width: `${Math.min(100, (previous / maxVal) * 100)}%`,
              height: 5,
              borderRadius: 3,
              backgroundColor: c.secondary,
            }}
          />
        </View>
      </View>
      <AppText role="caption" secondary>{note}</AppText>
    </Pressable>
  );
}

export function ProgressScreen() {
  const { state } = useCompeteStore();
  const router = useRouter();
  const [track] = useScoreTrackLens();
  const [range, setRange] = useState<TrainingRange>("week");

  if (!state) return null;

  const now = competeNow(state);
  const board = weeklyBoard(state, state.primary, track);
  const you = board.find((row) => row.you);

  // Training rhythm & comparison calculation
  const buckets = trainingBuckets(state.activities, "all", range, now, now).filter(
    (b) => Date.parse(b.start) <= now.getTime()
  );
  const comparison = trainingComparison(state.activities, "all", range, now, now);
  const activeHours = buckets.reduce((sum, b) => sum + b.movingSec, 0) / 3600;
  const sessionsCount = buckets.reduce((sum, b) => sum + b.sessions, 0);
  const activeDaysCount = new Set(
    state.activities
      .filter((a) => {
        const at = new Date(a.startedAt);
        return buckets.length > 0 && at >= new Date(buckets[0]!.start) && at <= now;
      })
      .map((a) => a.startedAt.slice(0, 10))
  ).size;

  // Personal records
  const records = personalRecordHistory(state, now);
  const pbs = records.slice(0, 2);

  // Plot data
  const maxHours = Math.max(1, ...buckets.map((b) => b.movingSec / 3600));

  return (
    <SafeAreaView style={f.safe} edges={[]}>
      <ScrollView contentContainerStyle={f.content}>
        <SectionStack divided={false}>
          {/* Header */}
          <View style={f.section}>
            <SectionHeader
              title="Progress"
              subtitle="A little further. A little more you."
            />
          </View>

          {/* 1. EFFORT SCORE FIRST */}
          <AthleteMetrics state={state} />
          <View style={f.section}>
            <Text style={f.kicker}>
              This week · {sportById(state.primary).name}
            </Text>
            <View style={[f.row, { flexWrap: "wrap", gap: 16 }]}>
              <View>
                <AppText role="caption" secondary>Distance</AppText>
                <AppText role="metric">
                  {you
                    ? formatVolume(
                        state.primary,
                        you.distanceM,
                        you.movingSec,
                        state.units
                      )
                    : "—"}
                </AppText>
              </View>
              <View>
                <AppText role="caption" secondary>Effort</AppText>
                <AppText role="metric">
                  {you ? formatEffort(you.effort) : "—"}
                </AppText>
              </View>
              <View>
                <AppText role="caption" secondary>Place</AppText>
                <AppText role="metric">
                  {you ? `${you.place} / ${board.length}` : "—"}
                </AppText>
              </View>
            </View>
          </View>

          {/* 2. ACTIVE PROGRESS & RHYTHM CHART */}
          <View style={f.section}>
            <View style={[f.row, { justifyContent: "space-between", alignItems: "flex-end" }]}>
              <View>
                <AppText role="caption" secondary>Active time</AppText>
                <AppText role="display">
                  {activeHours.toFixed(1)} <AppText role="body">hr</AppText>
                </AppText>
              </View>
              {comparison.label ? (
                <View style={[f.chip, { backgroundColor: c.soft, borderColor: c.line }]}>
                  <AppText role="caption">{comparison.label.replace(" compared", "")}</AppText>
                </View>
              ) : null}
            </View>

            {/* Range Segments */}
            <FocusSegments
              label="Training period"
              value={range}
              options={[
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
                { value: "year", label: "Year" },
              ]}
              onChange={setRange}
            />

            {/* Rhythm Bars */}
            {buckets.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Svg width="100%" height={100} viewBox="0 0 320 100" preserveAspectRatio="none">
                  {[0, 0.5, 1].map((v) => (
                    <Line
                      key={v}
                      x1={10}
                      x2={310}
                      y1={80 - v * 70}
                      y2={80 - v * 70}
                      stroke={c.line}
                      strokeDasharray="3 4"
                    />
                  ))}
                  {buckets.map((b, i) => {
                    const barH = ((b.movingSec / 3600) / maxHours) * 70;
                    const barW = Math.min(24, Math.max(6, 260 / buckets.length));
                    const x = 16 + (i / Math.max(1, buckets.length - 1)) * 280 - barW / 2;
                    const isLatest = i === buckets.length - 1;
                    return (
                      <Rect
                        key={b.start}
                        x={Math.max(4, x)}
                        y={80 - Math.max(2, barH)}
                        width={barW}
                        height={Math.max(2, barH)}
                        rx={3}
                        fill={isLatest ? c.tennis : c.secondary}
                      />
                    );
                  })}
                </Svg>
                <View style={[f.row, { justifyContent: "space-between", marginTop: 4 }]}>
                  <AppText role="caption" secondary>{buckets[0]?.label}</AppText>
                  {buckets.length > 2 && (
                    <AppText role="caption" secondary>
                      {buckets[Math.floor(buckets.length / 2)]?.label}
                    </AppText>
                  )}
                  <AppText role="caption" secondary>{buckets[buckets.length - 1]?.label}</AppText>
                </View>
              </View>
            )}

            {/* What's Changing Delta Cards */}
            <View style={{ marginTop: 14 }}>
              <SectionHeader
                title="What’s changing"
                subtitle="See what’s changing in your training."
              />
              <View style={[f.row, { gap: 12, marginTop: 8 }]}>
                <DeltaCard
                  title="Sessions"
                  value={String(sessionsCount)}
                  previous={Math.max(0, sessionsCount - ((comparison.percent ?? 0) > 0 ? 1 : 0))}
                  note={`vs previous ${range}`}
                  onPress={() => router.push("/athlete")}
                />
                <DeltaCard
                  title="Active days"
                  value={String(activeDaysCount)}
                  previous={Math.max(0, activeDaysCount - ((comparison.percent ?? 0) > 0 ? 1 : 0))}
                  note={`vs previous ${range}`}
                  onPress={() => router.push("/athlete")}
                />
              </View>
            </View>
          </View>

          {/* 3. PERSONAL BESTS */}
          <View style={f.section}>
            <SectionHeader
              title="Personal bests"
              action={
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/progress-achievements")}
                >
                  <AppText role="label">All records →</AppText>
                </Pressable>
              }
            />
            {pbs.length > 0 ? (
              <View style={{ gap: 8, marginTop: 8 }}>
                {pbs.map((record) => {
                  const label = getRecordLabel(record);
                  return (
                    <Pressable
                      key={record.activityId}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${label} personal best`}
                      onPress={() => router.push("/progress-achievements")}
                      style={[f.row, f.card, { padding: 14, backgroundColor: c.card }]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText role="heading">{formatClockTime(record.seconds)}</AppText>
                        <AppText role="caption" secondary>
                          {label} · {new Date(record.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </AppText>
                      </View>
                      <AppText role="label">→</AppText>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={[f.card, { marginTop: 8 }]}>
                <AppText role="body" secondary>
                  Complete your first counted run or ride to set records.
                </AppText>
              </View>
            )}
          </View>

          {/* 4. THE BIGGER PICTURE */}
          <View style={f.section}>
            <SectionHeader title="The bigger picture" />
            <TrainingAtlas state={state} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View closed competition weeks and award shelf"
              onPress={() => router.push("/progress-history")}
              style={[f.card, { marginTop: 12, backgroundColor: c.card }]}
            >
              <SectionHeader title="Past weeks & awards" />
              <AppText role="body" secondary>
                Closed competition weeks, chapter history, and your award shelf.
              </AppText>
              <AppText role="label" style={{ marginTop: 6 }}>View all →</AppText>
            </Pressable>
            {awardCards(state).length > 0 ? (
              <View style={{ marginTop: 10 }}>
                <AwardShelf cards={awardCards(state).slice(0, 3)} />
              </View>
            ) : null}
          </View>

          {state.periodResults.length ? (
            <Pressable
              accessibilityRole="button"
              style={f.section}
              onPress={() => router.push("/arena?results=latest")}
            >
              <AppText role="label">Latest week results ↗</AppText>
            </Pressable>
          ) : null}
        </SectionStack>
      </ScrollView>
    </SafeAreaView>
  );
}
