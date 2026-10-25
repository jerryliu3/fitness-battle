import { textStyle } from "../ui/section";
import { AppIcon } from "../ui/app-icon";
import { alpineTrail } from "../ui/club-art";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import {
  competeNow,
  competitionTrack,
  formatEffort,
  formatVolume,
  nextClubRival,
  sportById,
  weeklyBoard,
  type CompeteState,
} from "@fitness-battle/shared";

import { SHELL_COLORS as c } from "../theme";
export function RivalCard({ state }: { state: CompeteState }) {
  const router = useRouter();
  const sport =
    state.ratings.find((r) => r.sport === state.primary && r.optedIn)?.sport ??
    state.ratings.find((r) => r.optedIn)?.sport;
  const { you, rival, fieldSize } = nextClubRival(
    sport ? weeklyBoard(state, sport, competitionTrack(sport), competeNow(state)) : [],
  );
  const synthetic = Boolean(
    rival &&
      state.enrollments
        .find((e) => e.sport === sport)
        ?.syntheticIds.includes(rival.id),
  );
  const gap =
    rival && you && sport
      ? sportById(sport).gps
        ? formatVolume(
            sport,
            Math.max(0, rival.distanceM - you.distanceM),
            0,
            state.units,
          )
        : `${formatEffort(Math.max(0, rival.effort - you.effort))} pts`
      : null;
  const headline = rival
    ? `${gap} to ${rival.name.split(" ")[0]}`
    : you
      ? "You’re leading the way."
      : "Your next chapter starts here.";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sport ? sportById(sport).name : "Find your field"}. ${you ? `Place ${you.place} of ${fieldSize}. ` : ""}${headline}. ${synthetic ? "Simulated athlete. " : ""}Open Compete`}
      onPress={() =>
        router.navigate(sport ? `/arena?event=${sport}` : "/arena")
      }
      style={s.card}
    >
      <ImageBackground
        source={alpineTrail}
        style={s.background}
        imageStyle={{ borderRadius: 20 }}
      >
        <View style={s.scrim} />
        <View style={s.top}>
          <View>
            <Text style={s.title}>
              {sport ? sportById(sport).name : "Find your field"}
            </Text>
          </View>
          {you ? (
            <Text style={s.place}>
              {you.place} / {fieldSize}
              <Text style={s.eyebrow}> PLACE</Text>
            </Text>
          ) : null}
        </View>
        <View style={s.bottom}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.headline}>{headline}</Text>
            <Text style={s.caption}>
              {rival
                ? synthetic
                  ? "Next rival · simulated athlete"
                  : "Next rival in your field"
                : you
                  ? "Keep showing up. Every effort counts."
                  : "Register for a weekly event."}
            </Text>
          </View>
          <View style={s.arrow}><AppIcon name="external" size={22} /></View>
        </View>
      </ImageBackground>
    </Pressable>
  );
}
const s = StyleSheet.create({
  card: { borderRadius: 20, overflow: "hidden", backgroundColor: c.fieldDeep },
  background: { minHeight: 180, justifyContent: "space-between", padding: 20 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "#081f3670" },
  top: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  eyebrow: {
    ...textStyle("label"),
    color: "#ffffffdd"
},
  title: {
    ...textStyle("heading"),
    color: c.card,
    marginTop: 5
},
  place: { ...textStyle("heading"), color: c.card },
  markers: { alignSelf: "center", height: 110 },
  bottom: { flexDirection: "row", alignItems: "center", gap: 12 },
  headline: { ...textStyle("heading"), color: c.card },
  caption: {
    ...textStyle("caption"),
    color: "#ffffffdd"
},
  arrow: {
    backgroundColor: c.tennis,
    borderRadius: 22,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
