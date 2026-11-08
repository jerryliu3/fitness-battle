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
import { useCallback, useEffect, useRef, useState } from "react";
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

export default function Home() {
  const f = useFocusStyles();
  const s = useThemedStyles(sThemes);

  const router = useRouter();
  const { state, dispatch, accountKey } = useCompeteStore();
  const [removed, setRemoved] = useState<Activity | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<{
    items: Activity[];
    title: string;
  } | null>(null);
  const [expanded, setExpanded] = useState<"suggestion" | null>(null);

  useEffect(() => {
    setSelectedActivities(null);
    setRemoved(null);
  }, [accountKey]);

  useFocusEffect(
    useCallback(
      () => () => {
        setExpanded(null);
        setSelectedActivities(null);
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
              onOpenTodaySession={() => setExpanded("suggestion")}
              onOpenActivities={(items, title = "Your activity") =>
                setSelectedActivities({ items, title })
              }
            />

            <DailyHealth state={state} />

            <LatestActivity
              state={state}
              onOpen={(activity) =>
                setSelectedActivities({
                  items: [activity],
                  title: "Your activity",
                })
              }
            />
          </SectionStack>
        </ScrollView>
      </View>

      <FocusSheet
        open={Boolean(selectedActivities)}
        title={selectedActivities?.title ?? "Your activity"}
        onClose={() => setSelectedActivities(null)}
      >
        {selectedActivities ? (
          <SessionStage
            state={state}
            activities={selectedActivities.items}
            onRemove={(id) => {
              const target =
                selectedActivities.items.find((a) => a.id === id) ?? null;
              setRemoved(target);
              dispatch({
                type: "set-disposition",
                activityId: id,
                disposition: "excluded",
              });
              if (selectedActivities.items.length <= 1) {
                setSelectedActivities(null);
              } else {
                setSelectedActivities({
                  ...selectedActivities,
                  items: selectedActivities.items.filter((a) => a.id !== id),
                });
              }
            }}
          />
        ) : null}
      </FocusSheet>

      <FocusSheet
        open={expanded === "suggestion"}
        title="Today"
        onClose={() => setExpanded(null)}
      >
        <SessionStage
          state={state}
          activities={todayActivities}
          suggestion={route.suggestion}
          actions={<HomeActivityActions />}
          onRemove={(activityId) => {
            const target =
              todayActivities.find((a) => a.id === activityId) ?? null;
            setRemoved(target);
            dispatch({
              type: "set-disposition",
              activityId,
              disposition: "excluded",
            });
          }}
        />
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
