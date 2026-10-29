import { useThemeColors } from "../theme";
import { Section, TextAction, AppText } from "../ui/section";
import { useRouter } from "expo-router";
import { Platform, Pressable, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import {
  achievementAccessibilityLabel,
  clubAchievements,
  featuredClubAchievements,
  type ClubAchievement,
  type CompeteState,
} from "@fitness-battle/shared";
import { useAchievementTileStyle } from "./achievements-catalog";
import { AchievementMeter } from "./achievement-meter";
import { SHELL_COLORS as c } from "../theme";

function Badge({ item }: { item: ClubAchievement }) {
  const c = useThemeColors();

  const id = `feat-${item.id}`;
  return (
    <Svg width={64} height={70} viewBox="0 0 84 92" accessible={Platform.OS === "web" ? undefined : false}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor={item.earned ? (item.category === "effort" ? "#ffe39a" : "#6bbab2") : c.soft} />
          <Stop offset="1" stopColor={item.earned ? (item.category === "effort" ? "#e4a82b" : c.fieldTeal) : c.line} />
        </LinearGradient>
      </Defs>
      <Path d="M42 4 76 22v43L42 87 8 65V22Z" fill={`url(#${id})`} stroke={c.card} strokeWidth={3} />
      <Path d="M42 13 68 27v33L42 77 16 60V27Z" fill="none" stroke="#ffffff88" strokeWidth={2} />
      <Path
        d={item.category === "sessions" ? "m42 27 5 11 12 2-9 8 2 13-10-6-11 6 2-13-9-8 13-2Z" : "m46 23-18 26h12l-3 20 21-29H45Z"}
        fill={c.card}
      />
    </Svg>
  );
}

export function Achievements({ state }: { state: CompeteState }) {
  const tileStyle = useAchievementTileStyle();
  const rows = clubAchievements(state);
  const featured = featuredClubAchievements(rows);
  const router = useRouter();
  return (
    <Section title="Achievements" action={<TextAction label="View all" accessibilityLabel="View all achievements" onPress={() => router.push("/progress-achievements")}/> }>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {featured.map((row) => (
          <Pressable
            key={row.id}
            accessibilityRole="button"
            accessibilityLabel={achievementAccessibilityLabel(row)}
            onPress={() => router.push(`/progress-achievements?milestone=${row.id}`)}
            style={tileStyle.tile}
          >
            <Badge item={row} />
            <AchievementMeter row={row} />
            <AppText role="label" style={{ textAlign: "center" }}>
              {row.current.toLocaleString()} / {row.target.toLocaleString()}
            </AppText>
            <AppText role="caption" secondary style={{ textAlign: "center" }}>
              {row.title}
            </AppText>
          </Pressable>
        ))}
      </View>
    </Section>
  );
}
