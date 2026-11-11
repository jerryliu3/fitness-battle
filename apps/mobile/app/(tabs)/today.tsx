import {
  APP_TIMEZONE,
  buildTodayRoute,
  competeNow,
  countsOnTrack,
  dayKey,
  primaryFreezePeriodStart,
  type Activity,
} from "@fitness-battle/shared";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LatestActivity } from "../../src/features/club-latest-activity";
import { DailyHealth } from "../../src/features/daily-health";
import { HomeActivityActions } from "../../src/features/home-activity-actions";
import { HomeDeck } from "../../src/features/home-deck";
import { SessionStage } from "../../src/features/session-stage";
import { WeekChart } from "../../src/features/week-chart";
import { useCompeteStore } from "../../src/lib/compete-store";
import { createThemedStyles, useThemedStyles } from "../../src/theme";
import { FocusSheet, useFocusStyles } from "../../src/ui/focus";
import { AppText, SectionStack } from "../../src/ui/section";
import { AppHeader } from "../../src/ui/app-header";

export default function Home() {
  const f = useFocusStyles();
  const s = useThemedStyles(sThemes);

  const router = useRouter();
  const { state, dispatch, accountKey } = useCompeteStore();
  const [removed, setRemoved] = useState<Activity | null>(null);
  const [sheet, setSheet] = useState<{
    items: Activity[];
    title: string;
    isTodaySuggestion?: boolean;
  } | null>(null);

  useEffect(() => {
    setSheet(null);
    setRemoved(null);
  }, [accountKey]);

  useFocusEffect(
    useCallback(
      () => () => {
        setSheet(null);
      },
      [],
    ),
  );

  if (!state)
    return (
      <SafeAreaView style={f.safe}>
        <AppText role="body" secondary>
          Loading your week…
        </AppText>
      </SafeAreaView>
    );

  const route = buildTodayRoute(state);
  const now = competeNow(state);
  const counted = state.activities.filter(
    (a) => countsOnTrack(a, "open") && new Date(a.startedAt) <= now,
  );
  const todayKey = dayKey(now, APP_TIMEZONE);
  const todayActivities = counted.filter(
    (a) => dayKey(new Date(a.startedAt), APP_TIMEZONE) === todayKey,
  );

  return (
    <SafeAreaView style={f.safe} edges={[]}>
      <AppHeader />
      <View style={s.homeStage}>
        <ScrollView
          style={s.homeOverlayScroll}
          contentContainerStyle={s.homeOverlayContent}
          showsVerticalScrollIndicator={false}
        >
          {removed ? (
            <View style={f.row}>
              <AppText role="body" secondary accessibilityLiveRegion="polite">
                Session removed.
              </AppText>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  dispatch({
                    type: "set-disposition",
                    activityId: removed.id,
                    disposition: removed.disposition,
                  });
                  setRemoved(null);
                }}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <AppText role="label">Undo</AppText>
              </Pressable>
            </View>
          ) : null}

          {state.frozenPeriods.includes(primaryFreezePeriodStart(state)) ? (
            <View style={s.frozenBanner}>
              <AppText role="body" secondary>
                ❄ Week frozen · Your effort score is protected through next
                Monday.
              </AppText>
            </View>
          ) : null}

          <SectionStack divided={false}>
            <WeekChart state={state} onOpen={() => router.push("/week")} />

            <HomeDeck
              accountKey={accountKey}
              state={state}
              onOpenTodaySession={() =>
                setSheet({
                  items: todayActivities,
                  title: "Today",
                  isTodaySuggestion: true,
                })
              }
              onOpenActivities={(items, title = "Your activity") =>
                setSheet({ items, title, isTodaySuggestion: false })
              }
            />

            <DailyHealth state={state} />

            <LatestActivity
              state={state}
              onOpen={(activity) =>
                setSheet({
                  items: [activity],
                  title: "Your activity",
                  isTodaySuggestion: false,
                })
              }
            />
          </SectionStack>
        </ScrollView>
      </View>

      <FocusSheet
        open={Boolean(sheet)}
        title={sheet?.title ?? "Your activity"}
        onClose={() => setSheet(null)}
      >
        {sheet ? (
          <SessionStage
            state={state}
            activities={sheet.items}
            suggestion={sheet.isTodaySuggestion ? route.suggestion : undefined}
            actions={
              sheet.isTodaySuggestion ? <HomeActivityActions /> : undefined
            }
            onRemove={(id) => {
              const target = sheet.items.find((a) => a.id === id) ?? null;
              setRemoved(target);
              dispatch({
                type: "set-disposition",
                activityId: id,
                disposition: "excluded",
              });
              if (sheet.items.length <= 1) {
                setSheet(null);
              } else {
                setSheet({
                  ...sheet,
                  items: sheet.items.filter((a) => a.id !== id),
                });
              }
            }}
          />
        ) : null}
      </FocusSheet>
    </SafeAreaView>
  );
}

const sThemes = createThemedStyles((c) => ({
  homeStage: {
    flex: 1,
    position: "relative",
  },
  homeOverlayScroll: {
    flex: 1,
  },
  homeOverlayContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 140,
    gap: 24,
    maxWidth: 880,
    width: "100%",
    alignSelf: "center",
  },
  frozenBanner: {
    backgroundColor: c.soft,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
}));
