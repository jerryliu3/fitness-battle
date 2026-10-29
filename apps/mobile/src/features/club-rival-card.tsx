import { useAthleteBlocks } from "../lib/athlete-blocks";
import { createThemedStyles, useThemedStyles } from "../theme";
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
  nextClubRival,
  sportById,
  weeklyBoard,
  type CompeteState,
} from "@fitness-battle/shared";

import { SHELL_COLORS as c } from "../theme";
export function RivalCard({ state }: { state: CompeteState }) {
  const s = useThemedStyles(sThemes);

  const router = useRouter();
  const { blocks } = useAthleteBlocks();
  const imageSettled = useBootImage(alpineTrail);
  const sport =
    state.ratings.find((r) => r.sport === state.primary && r.optedIn)?.sport ??
    state.ratings.find((r) => r.optedIn)?.sport;
  const board = sport ? weeklyBoard(state, sport, competitionTrack(sport), competeNow(state)) : [];
  const summary = clubRivalCardSummary(
    board,
    sport,
    state.units,
    state.enrollments.find(e => e.sport === sport)?.syntheticIds,
  );
  const hiddenRival = blocks.some(block => block.id === nextClubRival(board).rival?.id);
  const { place } = summary;
  const headline = hiddenRival ? "Your field is moving." : summary.headline;
  const caption = hiddenRival ? "Open Compete to see your week." : summary.caption;
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
const sThemes = createThemedStyles((themeColors) => ({
  card: { borderRadius: 20, overflow: "hidden", backgroundColor: themeColors.fieldDeep },
  background: { minHeight: 180, justifyContent: "space-between", padding: 20 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "#081f3670" },
  top: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  title: {
    ...textStyle("heading"),
    color: themeColors.card,
    marginTop: 5
},
  place: { ...textStyle("metric"), color: themeColors.card },
  markers: { alignSelf: "center", height: 110 },
  bottom: { flexDirection: "row", alignItems: "center", gap: 12 },
  headline: { ...textStyle("heading"), color: themeColors.card },
  caption: {
    ...textStyle("caption"),
    color: "#ffffffdd"
},
  arrow: {
    backgroundColor: themeColors.tennis,
    borderRadius: 22,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
}));
