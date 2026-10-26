import { Section, TextAction, StatusBadge, AppText } from "../ui/section";
import { useRouter } from "expo-router";
import { Platform, Pressable, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import {
  clubAchievements,
  featuredClubAchievements,
  type ClubAchievement,
  type CompeteState,
} from "@fitness-battle/shared";
import { achievementTileStyle } from "./achievements-catalog";
import { SHELL_COLORS as c } from "../theme";

function Badge({ item }: { item: ClubAchievement }) {
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
            accessibilityLabel={`${row.title}. ${row.target} ${row.category === "sessions" ? "sessions" : "Open effort score"}. ${row.earned ? "Earned" : "In progress"}`}
            onPress={() => router.push(`/progress-achievements?milestone=${row.id}`)}
            style={achievementTileStyle.tile}
          >
            <Badge item={row} />
            <AppText role="metric" style={{ textAlign: "center" }}>
              {row.target.toLocaleString()}
            </AppText>
            <AppText role="caption" secondary>
              {row.category === "sessions" ? (row.target === 1 ? " session" : " sessions") : " pts"}
            </AppText>
            <AppText role="caption" secondary style={{ textAlign: "center" }}>{row.title}</AppText>
            <StatusBadge tone={row.earned ? "success" : "neutral"}>{row.earned ? "✓ Earned" : "Up next"}</StatusBadge>
          </Pressable>
        ))}
      </View>
    </Section>
  );
}
