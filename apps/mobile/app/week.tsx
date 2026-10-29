import { createThemedStyles, useThemedStyles } from "../src/theme";
import { useFocusStyles } from "../src/ui/focus";
import { SectionStack, AppText } from "../src/ui/section";
import { ScreenHeader } from "../src/ui/screen-header";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { WeekChart } from "../src/features/week-chart";
import { WeekRecap } from "../src/features/club-week-recap";
import { SessionStage } from "../src/features/session-stage";
import { HomeActivityActions } from "../src/features/home-activity-actions";
import { useCompeteStore } from "../src/lib/compete-store";
import { APP_TIMEZONE, buildTodayRoute, competeNow, countsOnTrack, dayKey } from "@fitness-battle/shared";
import { FocusSheet, f } from "../src/ui/focus";
import { SHELL_COLORS as c } from "../src/theme";

export default function Week() {
  const s = useThemedStyles(sThemes);
  const f = useFocusStyles();

  const { state, dispatch } = useCompeteStore();
  const router = useRouter();
  const [todayOpen, setTodayOpen] = useState(false);
  if (!state) return null;
  const route = buildTodayRoute(state);
  const now = competeNow(state);
  const counted = state.activities.filter(
    (a) => countsOnTrack(a, "open") && new Date(a.startedAt) <= now,
  );
  const todayActivities = counted.filter(
    (a) => dayKey(new Date(a.startedAt), APP_TIMEZONE) === dayKey(now, APP_TIMEZONE),
  );

  return (
    <SafeAreaView style={f.safe}>
      <ScreenHeader
        title="Your week"
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/today"))}
      />
      <ScrollView contentContainerStyle={[f.content, { paddingTop: 0 }]}>
        <SectionStack divided={false}>
          <WeekChart state={state} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open today’s session"
            onPress={() => setTodayOpen(true)}
            style={s.todayCta}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <AppText role="label">Today’s session</AppText>
              <AppText role="caption" secondary numberOfLines={1}>
                {todayActivities.length > 0
                  ? `${todayActivities.length} recorded session${todayActivities.length === 1 ? "" : "s"}`
                  : route.suggestion.title}
              </AppText>
            </View>
            <AppText role="label">View →</AppText>
          </Pressable>
          <WeekRecap state={state} />
        </SectionStack>
      </ScrollView>
      <FocusSheet
        open={todayOpen}
        title="Today"
        onClose={() => setTodayOpen(false)}
      >
        <SessionStage
          state={state}
          activities={todayActivities}
          suggestion={route.suggestion}
          actions={<HomeActivityActions />}
          onRemove={(activityId) =>
            dispatch({ type: "set-disposition", activityId, disposition: "excluded" })
          }
        />
      </FocusSheet>
    </SafeAreaView>
  );
}

const sThemes = createThemedStyles((themeColors) => ({
  todayCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.line,
    minHeight: 52,
  },
}));
