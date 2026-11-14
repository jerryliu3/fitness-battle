import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { FocusSegments } from "../ui/focus";
import { ActivityDetailSheet } from "./activity-detail-sheet";
import { AppText } from "../ui/section";
import { SportActivityIcon } from "../ui/sport-activity-icon";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import {
  APP_TIMEZONE,
  activityEffort,
  competeNow,
  countsOnTrack,
  dayKey,
  defaultTrainingSports,
  distanceUnitLabel,
  earliestDataDate,
  formatAppCalendarDate,
  formatClockTime,
  formatDistanceM,
  formatEffort,
  formatTrainingHours,
  formatWeeklyCompetitionRange,
  shiftAppDay,
  shiftTrainingMonth,
  sportById,
  trainingAtlas,
  trainingBuckets,
  trainingRangeNavigation,
  trainingYearAnchor,
  weeklyPeriodBounds,
  type Activity,
  type CompeteState,
} from "@fitness-battle/shared";

type HorizonChoice = "week" | "month" | "year";

export function JourneySpace({
  state,
  initialHorizon = "week",
}: {
  state: CompeteState;
  initialHorizon?: HorizonChoice;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);
  const router = useRouter();

  const now = useMemo(() => competeNow(state), [state]);
  const earliest = useMemo(() => earliestDataDate(state, now), [state, now]);

  const [horizon, setHorizon] = useState<HorizonChoice>(initialHorizon);
  const [dayOffset, setDayOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [yearOffset, setYearOffset] = useState(0);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [gridWidth, setGridWidth] = useState(320);

  // Activity modal inspection state
  const [inspectedActivity, setInspectedActivity] = useState<Activity | null>(null);

  useEffect(() => {
    setHorizon(initialHorizon);
    setSelectedDayKey(null);
  }, [initialHorizon]);

  // --- 1. Week Horizon (7 days strip) ---
  const calendarDays = useMemo(() => {
    const week = weeklyPeriodBounds(shiftAppDay(now, dayOffset * 7));
    const monday = week.startsAt;
    const days: Array<{
      dayKey: string;
      dateNum: number;
      dayLabel: string;
      hasActivity: boolean;
      isToday: boolean;
    }> = [];

    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const todayStr = dayKey(now);

    for (let i = 0; i < 7; i++) {
      const d = shiftAppDay(monday, i);
      const key = dayKey(d);
      const hasActivity = state.activities.some((a) => {
        return countsOnTrack(a, "open") && dayKey(new Date(a.startedAt)) === key;
      });

      days.push({
        dayKey: key,
        dateNum: Number(key.slice(-2)),
        dayLabel: labels[i] ?? "",
        hasActivity,
        isToday: key === todayStr,
      });
    }

    return { days, monday };
  }, [state.activities, now, dayOffset]);

  // Week summary
  const weekSummary = useMemo(() => {
    const startIso = calendarDays.monday.toISOString();
    const endIso = shiftAppDay(calendarDays.monday, 7).toISOString();
    const weekActs = state.activities.filter((a) => {
      return (
        countsOnTrack(a, "open") &&
        a.startedAt >= startIso &&
        a.startedAt < endIso
      );
    });
    const hours = (weekActs.reduce((sum, a) => sum + Math.max(0, a.movingSec), 0) / 3600).toFixed(1);
    const effort = weekActs.reduce((sum, a) => sum + activityEffort(a), 0);
    return { count: weekActs.length, hours, effort: formatEffort(effort) };
  }, [state.activities, calendarDays.monday]);

  // --- 2. Month Horizon (Training Atlas Heatmap) ---
  const monthAnchor = useMemo(
    () => shiftTrainingMonth(now, monthOffset),
    [now, monthOffset],
  );

  const { prevAllowed: monthPrevAllowed, nextAllowed: monthNextAllowed } = useMemo(
    () => trainingRangeNavigation(monthAnchor, earliest, now, "month"),
    [monthAnchor, earliest, now],
  );

  const monthCells = useMemo(() => {
    return trainingAtlas(
      state.activities,
      defaultTrainingSports(),
      monthAnchor,
      now,
    );
  }, [state.activities, monthAnchor, now]);

  const monthColors = useMemo(
    () => [c.card, `${c.tennis}33`, `${c.tennis}66`, `${c.tennis}99`, c.tennis],
    [c],
  );

  const monthSummary = useMemo(() => {
    const inMonthCells = monthCells.filter((cell) => cell.inMonth && !cell.future);
    const sessions = inMonthCells.reduce((sum, cell) => sum + cell.sessions, 0);
    const movingSec = inMonthCells.reduce((sum, cell) => sum + cell.movingSec, 0);
    const hours = (movingSec / 3600).toFixed(1);
    const monthDays = new Set(inMonthCells.map((cell) => cell.day));
    const effort = formatEffort(state.activities.filter((a) =>
      countsOnTrack(a, "open") && monthDays.has(dayKey(new Date(a.startedAt))),
    ).reduce((sum, a) => sum + activityEffort(a), 0));
    return { sessions, hours, effort };
  }, [monthCells, state.activities]);

  // --- 3. Year Horizon (Annual Atlas & Monthly Progression) ---
  const yearAnchor = useMemo(() => trainingYearAnchor(now, yearOffset), [now, yearOffset]);

  const { prevAllowed: yearPrevAllowed, nextAllowed: yearNextAllowed } = useMemo(
    () => trainingRangeNavigation(yearAnchor, earliest, now, "year"),
    [yearAnchor, earliest, now],
  );

  const yearBuckets = useMemo(() => {
    return trainingBuckets(
      state.activities,
      defaultTrainingSports(),
      "year",
      yearAnchor,
      now,
    );
  }, [state.activities, yearAnchor, now]);

  const maxMonthSec = useMemo(() => {
    return Math.max(3600, ...yearBuckets.map((b) => b.movingSec));
  }, [yearBuckets]);

  const yearSummary = useMemo(() => {
    const yearStr = dayKey(yearAnchor).slice(0, 4);
    const yearActs = state.activities.filter((a) => {
      return (
        countsOnTrack(a, "open") &&
        dayKey(new Date(a.startedAt)).startsWith(yearStr) &&
        Date.parse(a.startedAt) <= now.getTime()
      );
    });
    const hours = (yearActs.reduce((sum, a) => sum + Math.max(0, a.movingSec), 0) / 3600).toFixed(0);
    const distanceM = yearActs.reduce((sum, a) => sum + Math.max(0, a.distanceM), 0);
    const effort = formatEffort(yearActs.reduce((sum, a) => sum + activityEffort(a), 0));
    const battles = state.periodResults.filter((r) =>
      r.periodStart.startsWith(yearStr),
    ).length;
    return {
      activities: yearActs.length,
      hours,
      distanceM,
      battles,
      effort,
    };
  }, [state.activities, state.periodResults, yearAnchor, now]);

  // Filtered recent activities
  const recentActivities = useMemo(() => {
    let list = [...state.activities].filter((a) => countsOnTrack(a, "open"));
    if (selectedDayKey) {
      list = list.filter(
        (a) => dayKey(new Date(a.startedAt), APP_TIMEZONE) === selectedDayKey,
      );
    }
    return list.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  }, [state.activities, selectedDayKey]);

  const formatActivityDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: APP_TIMEZONE,
    });
  };

  return (
    <View style={s.container}>
      {/* 1. Horizon Toggle */}
      <View style={s.horizonRow}>
        <FocusSegments
          label="Time horizon"
          value={horizon}
          options={[
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
            { value: "year", label: "Year" },
          ]}
          onChange={(next) => { setHorizon(next); setSelectedDayKey(null); }}
        />
      </View>

      {/* 2. Horizon Visual Experience */}
      {/* 2A. Week Horizon: 7-Day Day Strip */}
      {horizon === "week" && (
        <View style={s.card}>
          <View style={s.calendarNavRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous week"
              onPress={() => { setDayOffset((prev) => prev - 1); setSelectedDayKey(null); }}
              style={s.navBtn}
            >
              <AppText role="body" style={{ color: c.ink }}>←</AppText>
            </Pressable>

            <AppText role="heading">
              {formatWeeklyCompetitionRange(calendarDays.monday)}
            </AppText>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next week"
              onPress={() => { setDayOffset((prev) => Math.min(0, prev + 1)); setSelectedDayKey(null); }}
              disabled={dayOffset >= 0}
              style={[s.navBtn, dayOffset >= 0 && { opacity: 0.3 }]}
            >
              <AppText role="body" style={{ color: c.ink }}>→</AppText>
            </Pressable>
          </View>

          {/* 7 Days Strip */}
          <View style={s.stripRow}>
            {calendarDays.days.map((item) => {
              const isSelected = selectedDayKey === item.dayKey;
              return (
                <Pressable
                  key={item.dayKey}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.dayLabel} ${item.dateNum}${item.hasActivity ? ", has activity" : ""}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() =>
                    setSelectedDayKey(isSelected ? null : item.dayKey)
                  }
                  style={[
                    s.dayItem,
                    isSelected && s.dayItemSelected,
                    item.isToday && !isSelected && s.dayItemToday,
                  ]}
                >
                  <AppText
                    role="label"
                    style={{
                      color: isSelected ? c.card : c.muted,
                    }}
                  >
                    {item.dayLabel}
                  </AppText>

                  <AppText
                    role={item.isToday ? "value" : "label"}
                    style={{
                      color: isSelected ? c.card : c.ink,
                    }}
                  >
                    {item.dateNum}
                  </AppText>

                  {/* Activity Indicator Dot */}
                  <View
                    style={[
                      s.activityDot,
                      item.hasActivity && (isSelected ? s.activityDotActiveSelected : s.activityDotActive),
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>

          {/* Week Quick Stats */}
          <View style={s.atlasStatsRow}>
            <View style={s.statBox}>
              <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                {weekSummary.count}
              </AppText>
              <AppText role="caption" secondary>Workouts</AppText>
            </View>
            <View style={s.statBox}>
              <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                {weekSummary.hours}
              </AppText>
              <AppText role="caption" secondary>Hours</AppText>
            </View>
            <View style={s.statBox}>
              <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                {weekSummary.effort}
              </AppText>
              <AppText role="caption" secondary>Effort</AppText>
            </View>
          </View>
        </View>
      )}

      {/* 2B. Month Horizon: Monthly Training Heatmap */}
      {horizon === "month" && (
        <View style={s.card}>
          <View style={s.calendarNavRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              disabled={!monthPrevAllowed}
              onPress={() => { setMonthOffset((prev) => prev - 1); setSelectedDayKey(null); }}
              style={[s.navBtn, !monthPrevAllowed && { opacity: 0.3 }]}
            >
              <AppText role="body" style={{ color: c.ink }}>←</AppText>
            </Pressable>

            <AppText role="heading">
              {monthAnchor.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
                timeZone: APP_TIMEZONE,
              })}
            </AppText>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              disabled={!monthNextAllowed}
              onPress={() => { setMonthOffset((prev) => prev + 1); setSelectedDayKey(null); }}
              style={[s.navBtn, !monthNextAllowed && { opacity: 0.3 }]}
            >
              <AppText role="body" style={{ color: c.ink }}>→</AppText>
            </Pressable>
          </View>

          {/* Monthly Heatmap Calendar Grid */}
          <View
            onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
            style={{ width: "100%", gap: 4 }}
          >
            {/* Weekday headers */}
            <View style={{ flexDirection: "row", gap: 4 }}>
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <AppText
                  key={i}
                  role="caption"
                  secondary
                  style={{
                    width: (gridWidth - 24) / 7,
                    textAlign: "center",
                    paddingVertical: 2,
                  }}
                >
                  {d}
                </AppText>
              ))}
            </View>

            {/* Heatmap cells */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
              {monthCells.map((d) => {
                const isSelected = selectedDayKey === d.day;
                const cellW = (gridWidth - 24) / 7;
                return (
                  <Pressable
                    key={d.day}
                    disabled={!d.inMonth || d.future}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${d.day}, ${formatTrainingHours(d.movingSec)} hours, ${d.sessions} ${d.sessions === 1 ? "session" : "sessions"}`}
                    onPress={() => setSelectedDayKey(isSelected ? null : d.day)}
                    style={[
                      s.heatmapCell,
                      {
                        width: cellW,
                        height: cellW,
                        opacity: !d.inMonth ? 0 : d.future ? 0.25 : 1,
                        backgroundColor: monthColors[d.intensity],
                        borderWidth: isSelected ? 2 : 0,
                        borderColor: c.tennis,
                      },
                    ]}
                  >
                    <AppText
                      role={d.movingSec > 0 ? "label" : "caption"}
                      style={{
                        color: d.intensity >= 3 ? c.card : c.ink,
                      }}
                    >
                      {d.inMonth ? d.label : ""}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* Heatmap intensity legend */}
            <View style={s.legendRow}>
              <AppText role="caption" secondary>Less</AppText>
              <View style={{ flexDirection: "row", gap: 3, alignItems: "center" }}>
                {monthColors.map((color, idx) => (
                  <View
                    key={idx}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      backgroundColor: color,
                      borderWidth: idx === 0 ? 1 : 0,
                      borderColor: c.line,
                    }}
                  />
                ))}
              </View>
              <AppText role="caption" secondary>More</AppText>
            </View>
          </View>

          {/* Month Quick Stats */}
          <View style={s.atlasStatsRow}>
            <View style={s.statBox}>
              <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                {monthSummary.sessions}
              </AppText>
              <AppText role="caption" secondary>Sessions</AppText>
            </View>
            <View style={s.statBox}>
              <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                {monthSummary.hours}
              </AppText>
              <AppText role="caption" secondary>Hours</AppText>
            </View>
            <View style={s.statBox}>
              <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                {monthSummary.effort}
              </AppText>
              <AppText role="caption" secondary>Effort</AppText>
            </View>
          </View>
        </View>
      )}

      {/* 2C. Year Horizon: Annual Training Atlas & Monthly Season Progression */}
      {horizon === "year" && (
        <View style={s.card}>
          <View style={s.calendarNavRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous year"
              disabled={!yearPrevAllowed}
              onPress={() => setYearOffset((prev) => prev - 1)}
              style={[s.navBtn, !yearPrevAllowed && { opacity: 0.3 }]}
            >
              <AppText role="body" style={{ color: c.ink }}>←</AppText>
            </Pressable>

            <AppText role="heading">
              {dayKey(yearAnchor).slice(0, 4)}
            </AppText>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next year"
              disabled={!yearNextAllowed}
              onPress={() => setYearOffset((prev) => prev + 1)}
              style={[s.navBtn, !yearNextAllowed && { opacity: 0.3 }]}
            >
              <AppText role="body" style={{ color: c.ink }}>→</AppText>
            </Pressable>
          </View>

          {/* 12-Month Progression Bar Grid */}
          <View style={s.yearBarsRow}>
            {yearBuckets.map((bucket, i) => {
              const barHeight =
                bucket.movingSec > 0
                  ? Math.max(6, Math.round((bucket.movingSec / maxMonthSec) * 44))
                  : 3;
              const hasActivity = bucket.movingSec > 0;
              return (
                <View key={bucket.start} style={s.yearMonthColumn}>
                  <View style={s.yearBarSlot}>
                    <View
                      style={[
                        s.yearBar,
                        {
                          height: barHeight,
                          backgroundColor: hasActivity ? c.tennis : `${c.line}66`,
                        },
                      ]}
                    />
                  </View>
                  <AppText role="caption" secondary style={{ textAlign: "center" }}>
                    {bucket.label.slice(0, 1)}
                  </AppText>
                </View>
              );
            })}
          </View>

          {/* Annual Atlas Overview Stats */}
          <View style={s.atlasStatsRow}>
            <View style={s.statBox}>
              <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                {yearSummary.activities}
              </AppText>
              <AppText role="caption" secondary>Activities</AppText>
            </View>
            <View style={s.statBox}>
              <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                {yearSummary.hours}
              </AppText>
              <AppText role="caption" secondary>Hours</AppText>
            </View>
            <View style={s.statBox}>
              <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                {yearSummary.battles}
              </AppText>
              <AppText role="caption" secondary>Battles</AppText>
            </View>
            <View style={s.statBox}>
              <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                {yearSummary.effort}
              </AppText>
              <AppText role="caption" secondary>Effort</AppText>
            </View>
          </View>
        </View>
      )}

      {/* Recent Activities */}
      <View style={{ gap: 12 }}>
        <View style={s.sectionHeaderRow}>
          <AppText role="heading">
            {selectedDayKey
              ? `Activities on ${formatAppCalendarDate(selectedDayKey, { weekday: "short", month: "short", day: "numeric" })}`
              : "Recent Activities"}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {selectedDayKey && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear day filter"
                onPress={() => setSelectedDayKey(null)}
                style={s.textLink}
              >
                <AppText role="label" style={{ color: c.tennis }}>
                  Clear filter
                </AppText>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View full activity history"
              onPress={() => router.push("/progress-history?tab=activities")}
              style={s.textLink}
            >
              <AppText role="caption" secondary>View all →</AppText>
            </Pressable>
          </View>
        </View>

        {recentActivities.length === 0 ? (
          <View style={[s.card, { paddingVertical: 24, alignItems: "center" }]}>
            <AppText role="body" secondary>
              {selectedDayKey
                ? "No activities logged on this day."
                : "No activities recorded yet. Complete your first workout to start your journey."}
            </AppText>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {recentActivities.slice(0, 5).map((activity) => {
              const sportInfo = sportById(activity.sport);
              const effort = formatEffort(activityEffort(activity));
              return (
                <Pressable
                  key={activity.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${sportInfo.name}, ${formatClockTime(activity.movingSec)}, ${effort} effort`}
                  onPress={() => setInspectedActivity(activity)}
                  style={s.activityRow}
                >
                  <View style={s.activityIconWrapper}>
                    <SportActivityIcon sport={activity.sport} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText role="row">
                      {sportInfo.name}
                    </AppText>
                    <AppText role="caption" secondary>
                      {formatActivityDate(activity.startedAt)}
                      {activity.distanceM > 0
                        ? ` · ${formatDistanceM(activity.distanceM, state.units)} ${distanceUnitLabel(state.units)}`
                        : ""}
                    </AppText>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    <AppText role="value" style={{ fontVariant: ["tabular-nums"] }}>
                      {formatClockTime(activity.movingSec)}
                    </AppText>
                    <AppText role="label" style={{ color: c.tennis }}>
                      {effort} effort
                    </AppText>
                  </View>
                  <AppText role="caption" secondary style={{ marginLeft: 6 }}>
                    ›
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

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
      gap: 24,
    },
    horizonRow: {
      alignItems: "center",
    },
    card: {
      padding: 16,
      borderRadius: 20,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.line,
      gap: 12,
    },
    calendarNavRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    navBtn: {
      minWidth: 36,
      minHeight: 36,
      borderRadius: 18,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      alignItems: "center",
      justifyContent: "center",
    },
    stripRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 4,
    },
    dayItem: {
      flex: 1,
      minHeight: 64,
      borderRadius: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      gap: 3,
    },
    dayItemSelected: {
      backgroundColor: c.ink,
      borderColor: c.ink,
    },
    dayItemToday: {
      borderColor: c.tennis,
      borderWidth: 1.5,
    },
    activityDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: "transparent",
      marginTop: 2,
    },
    activityDotActive: {
      backgroundColor: c.tennis,
    },
    activityDotActiveSelected: {
      backgroundColor: c.card,
    },
    heatmapCell: {
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    legendRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 6,
      paddingTop: 8,
    },
    yearBarsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      height: 70,
      paddingHorizontal: 4,
      paddingTop: 8,
    },
    yearMonthColumn: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    yearBarSlot: {
      height: 48,
      justifyContent: "flex-end",
      alignItems: "center",
      width: "100%",
    },
    yearBar: {
      width: 8,
      borderRadius: 4,
    },
    atlasStatsRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: c.line,
    },
    statBox: {
      alignItems: "center",
      gap: 2,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    textLink: {
      paddingVertical: 4,
    },
    activityRow: {
      padding: 14,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    activityIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: `${c.tennis}22`,
      alignItems: "center",
      justifyContent: "center",
    },
    resultContainer: {
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      overflow: "hidden",
    },
    resultHeaderRow: {
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    placeBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: `${c.line}44`,
      alignItems: "center",
      justifyContent: "center",
    },
    expandedResultContent: {
      padding: 14,
      paddingTop: 0,
      borderTopWidth: 1,
      borderTopColor: c.line,
    },
  };
});
