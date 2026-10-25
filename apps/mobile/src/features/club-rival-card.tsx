import { useBootImage } from "../ui/boot-readiness";
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
  clubRivalCardSummary,
  sportById,
  weeklyBoard,
  type CompeteState,
} from "@fitness-battle/shared";

import { SHELL_COLORS as c } from "../theme";
export function RivalCard({ state }: { state: CompeteState }) {
  const router = useRouter();
  const imageSettled = useBootImage(alpineTrail);
  const sport =
    state.ratings.find((r) => r.sport === state.primary && r.optedIn)?.sport ??
    state.ratings.find((r) => r.optedIn)?.sport;
  const { place, headline, caption } = clubRivalCardSummary(
    sport ? weeklyBoard(state, sport, competitionTrack(sport), competeNow(state)) : [],
    sport,
    state.units,
    state.enrollments.find(e => e.sport === sport)?.syntheticIds,
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sport ? sportById(sport).name : "Find your field"}. ${place ? `${place} place. ` : ""}${headline}. ${caption}. Open Compete`}
      onPress={() =>
        router.navigate(sport ? `/arena?event=${sport}` : "/arena")
      }
      style={s.card}
    >
      <ImageBackground
        source={alpineTrail}
        onLoadEnd={imageSettled}
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
          {place ? (
            <Text style={s.place}>
              {place}
            </Text>
          ) : null}
        </View>
        <View style={s.bottom}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.headline}>{headline}</Text>
            <Text style={s.caption}>{caption}</Text>
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
