import {
  competeNow,
  countsOnTrack,
  formatEffort,
  formatVolume,
  activityEffort,
  lessonFor,
  sportById,
  type Activity,
} from "@fitness-battle/shared";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useCompete } from "../../src/compete/store";
import { Checkpoints } from "../../src/features/checkpoints";
import { Button } from "../../src/ui/button";
import { Screen } from "../../src/ui/screen";
import { Sheet } from "../../src/ui/sheet";
import { colors, fonts } from "../../src/theme";

export default function TodayScreen() {
  const { state, arrival, dispatch } = useCompete();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [coach, setCoach] = useState(false);

  useEffect(() => {
    if (arrival) router.replace("/arena");
  }, [arrival]);

  if (!state) {
    return (
      <Screen>
        <Text style={{ fontFamily: fonts.body, color: colors.muted }}>Loading your week…</Text>
      </Screen>
    );
  }

  const now = competeNow(state);
  const sport = sportById(state.primary);
  const lesson = lessonFor(state.primary, now);
  const done = state.lessonDoneOn === now.toISOString().slice(0, 10);
  const week = state.activities.filter(
    (item) => item.sport === state.primary && countsOnTrack(item, "open") && new Date(item.startedAt) <= now,
  );
  const distanceM = week.reduce((sum, item) => sum + item.distanceM, 0);
  const movingSec = week.reduce((sum, item) => sum + item.movingSec, 0);

  return (
    <Screen kicker={sport.name} title={formatVolume(state.primary, distanceM, movingSec)}>
      <Checkpoints state={state} onActivity={setActivity} onToday={() => setCoach(true)} />
      <Sheet
        title={activity ? "Counted session" : "Today"}
        visible={Boolean(activity) || coach}
        onClose={() => {
          setActivity(null);
          setCoach(false);
        }}
      >
        {activity ? (
          <>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 28, color: colors.ink }}>
              {formatVolume(state.primary, activity.distanceM, activity.movingSec)}
            </Text>
            <Text style={{ fontFamily: fonts.body, color: colors.muted }}>
              {Math.round(activity.movingSec / 60)} min · {formatEffort(activityEffort(activity))} effort
            </Text>
            <Button
              label="See it on the track"
              onPress={() => {
                setActivity(null);
                router.push("/arena");
              }}
            />
          </>
        ) : (
          <>
            <Text style={{ fontFamily: fonts.body, color: colors.ink, lineHeight: 22 }}>{lesson.detail}</Text>
            <Button
              label={done ? "Tip completed" : "Got it"}
              disabled={done}
              onPress={() => {
                dispatch({ type: "complete-lesson" });
                setCoach(false);
              }}
            />
          </>
        )}
      </Sheet>
    </Screen>
  );
}
