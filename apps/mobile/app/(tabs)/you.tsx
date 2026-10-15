import {
  competeNow,
  formatPlace,
  formatVolume,
  rankForElo,
  sportById,
} from "@fitness-battle/shared";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useCompete } from "../../src/compete/store";
import { AwardCard } from "../../src/features/award-card";
import { Row } from "../../src/ui/row";
import { EmptyNote, Screen } from "../../src/ui/screen";
import { colors, fonts } from "../../src/theme";

export default function YouScreen() {
  const { state, dispatch } = useCompete();
  if (!state) return <Screen title="You" />;

  const now = competeNow(state);
  const sport = sportById(state.primary);
  const rating = state.ratings.find((row) => row.sport === state.primary);
  const elo = rating?.openElo ?? 1000;
  const awards = state.periodResults
    .filter((result) => result.track === "open")
    .slice(0, 8);
  const sessions = state.activities.filter((activity) => activity.sport === state.primary).slice(-8).reverse();

  return (
    <Screen kicker={state.city || "You"} title={state.name}>
      <Text style={{ fontFamily: fonts.body, color: colors.muted }}>
        {rankForElo(elo).name} · {elo} · {sport.name}
      </Text>
      {awards.length === 0 ? (
        <EmptyNote text="Week awards show up after a week closes." />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
          {awards.map((result) => (
            <AwardCard key={result.id} result={result} />
          ))}
        </ScrollView>
      )}
      <Row title="Phone health sync" trailing="Open" onPress={() => router.push("/connections")} />
      <Row title="Notifications" trailing="Open" onPress={() => router.push("/settings")} />
      <Text style={styles.heading}>Sessions</Text>
      {sessions.length === 0 ? <EmptyNote text="Imports show up here." /> : null}
      {sessions.map((activity) => {
        const counted = (activity.disposition ?? "counted") === "counted";
        return (
          <Row
            key={activity.id}
            title={formatVolume(state.primary, activity.distanceM, activity.movingSec)}
            detail={new Date(activity.startedAt).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
            trailing={counted ? "Exclude" : "Count"}
            onPress={() =>
              dispatch({
                type: "set-disposition",
                activityId: activity.id,
                disposition: counted ? "excluded" : "counted",
                now: now.toISOString(),
              })
            }
          />
        );
      })}
      {awards[0] ? (
        <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 13 }}>
          Latest place {formatPlace(awards[0].place, awards[0].fieldSize)}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  shelf: { gap: 12, paddingVertical: 4 },
  heading: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink, marginTop: 8 },
});
