import { createThemedStyles, useThemedStyles, useThemeColors } from "../src/theme";
import { useFocusStyles, FocusSegments } from "../src/ui/focus";
import { AppText, SectionStack } from "../src/ui/section";
import { ActivityDetailSheet } from "../src/features/activity-detail-sheet";
import { ScreenHeader } from "../src/ui/screen-header";
import { WeeklyChapters } from "../src/features/weekly-chapters";
import { AwardShelf } from "../src/ui/award-shelf";
import { ActivityListRow } from "../src/ui/activity-list-row";
import { useAuth } from "../src/lib/auth";
import { useCompeteStore } from "../src/lib/compete-store";
import { awardCards } from "@fitness-battle/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  activityEffort,
  countsOnTrack,
  formatEffort,
  sportById,
  type Activity,
  type SportId,
} from "@fitness-battle/shared";

type HistoryTab = "competitions" | "activities";

const TAB_OPTIONS: readonly { value: HistoryTab; label: string }[] = [
  { value: "competitions", label: "Competitions" },
  { value: "activities", label: "Activities" },
];

export default function ProgressHistoryScreen() {
  const c = useThemeColors();
  const f = useFocusStyles();
  const s = useThemedStyles(sThemes);
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { accessToken } = useAuth();
  const { state } = useCompeteStore();

  const [activeTab, setActiveTab] = useState<HistoryTab>(
    params.tab === "activities" ? "activities" : "competitions",
  );
  useEffect(() => {
    setActiveTab(params.tab === "activities" ? "activities" : "competitions");
  }, [params.tab]);
  const [selectedSport, setSelectedSport] = useState<SportId | "all">("all");
  const [inspectedActivity, setInspectedActivity] = useState<Activity | null>(null);

  const filteredActivities = useMemo(() => {
    if (!state?.activities) return [];
    return [...state.activities]
      .filter((a) => {
        if (!countsOnTrack(a, "open")) return false;
        if (selectedSport !== "all" && a.sport !== selectedSport) return false;
        return true;
      })
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  }, [state?.activities, selectedSport]);

  const summary = useMemo(() => {
    const count = filteredActivities.length;
    const movingSec = filteredActivities.reduce((acc, a) => acc + Math.max(0, a.movingSec), 0);
    const effort = formatEffort(filteredActivities.reduce(
      (acc, a) => acc + activityEffort(a),
      0,
    ));
    return {
      count,
      hours: (movingSec / 3600).toFixed(1),
      effort,
    };
  }, [filteredActivities]);

  if (!state) return null;

  return (
    <SafeAreaView style={f.safe} edges={["top"]}>
      <ScreenHeader
        title={activeTab === "activities" ? "Activity history" : "Past weeks & awards"}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={s.content}>
        {/* Tab Switcher: Competitions vs Activities */}
        <FocusSegments
          label="History view"
          value={activeTab}
          options={TAB_OPTIONS}
          onChange={setActiveTab}
        />

        {activeTab === "competitions" ? (
          <SectionStack divided={false}>
            <WeeklyChapters state={state} />
            {awardCards(state).length > 0 ? (
              <AwardShelf cards={awardCards(state)} />
            ) : null}
          </SectionStack>
        ) : (
          <View style={{ gap: 16 }}>
            {/* Sport Filter Chips */}
            <View style={s.sportRow}>
              {(["all", "running", "cycling"] as const).map((sport) => {
                const active = selectedSport === sport;
                return (
                  <Pressable
                    key={sport}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
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

            {/* Summary Statistics */}
            <View style={s.summaryCard}>
              <View style={s.statBox}>
                <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                  {summary.count}
                </AppText>
                <AppText role="caption" secondary>Workouts</AppText>
              </View>
              <View style={s.statDivider} />
              <View style={s.statBox}>
                <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                  {summary.hours}
                </AppText>
                <AppText role="caption" secondary>Hours</AppText>
              </View>
              <View style={s.statDivider} />
              <View style={s.statBox}>
                <AppText role="hero" style={{ fontVariant: ["tabular-nums"] }}>
                  {summary.effort}
                </AppText>
                <AppText role="caption" secondary>Effort</AppText>
              </View>
            </View>

            {/* Activity Items List */}
            {filteredActivities.length === 0 ? (
              <View style={s.emptyCard}>
                <AppText role="body" secondary>
                  No activities found for the selected sport.
                </AppText>
              </View>
            ) : (
              <View style={s.listContainer}>
                {filteredActivities.map((activity) => (
                  <ActivityListRow
                    key={activity.id}
                    activity={activity}
                    history={state.activities}
                    units={state.units}
                    accessToken={accessToken}
                    surface="soft"
                    onPress={setInspectedActivity}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <ActivityDetailSheet
        activity={inspectedActivity}
        units={state.units}
        onClose={() => setInspectedActivity(null)}
      />
    </SafeAreaView>
  );
}

const sThemes = createThemedStyles((themeColors) => {
  const c = themeColors;
  return {
    content: {
      padding: 16,
      paddingTop: 0,
      gap: 16,
      paddingBottom: 40,
    },
    sportRow: {
      flexDirection: "row",
      gap: 8,
    },
    sportPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.line,
    },
    sportPillActive: {
      backgroundColor: c.ink,
      borderColor: c.ink,
    },
    summaryCard: {
      padding: 16,
      borderRadius: 20,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.line,
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
    },
    statBox: {
      alignItems: "center",
      gap: 2,
    },
    statDivider: {
      width: 1,
      height: 32,
      backgroundColor: c.line,
    },
    emptyCard: {
      padding: 24,
      borderRadius: 20,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.line,
      alignItems: "center",
    },
    listContainer: {
      gap: 8,
    },
  };
});
