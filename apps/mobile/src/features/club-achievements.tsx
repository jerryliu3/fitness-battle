import { useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import {
  clubAchievements,
  featuredClubAchievements,
  type ClubAchievement,
  type CompeteState,
} from "@fitness-battle/shared";
import { achievementTileStyle } from "./achievements-catalog";
import { f } from "../ui/focus";
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
    <View style={[f.section, { gap: 12 }]}>
      <View style={f.row}>
        <Text accessibilityRole="header" style={f.sectionTitle}>Achievements</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View all achievements"
          style={{ minHeight: 44, justifyContent: "center" }}
          onPress={() => router.push("/progress-achievements")}
        >
          <Text style={f.rowTitle}>View all →</Text>
        </Pressable>
      </View>
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
            <Text style={[f.rowTitle, { textAlign: "center", fontSize: 13, fontFamily: "DMSans_700Bold" }]}>
              {row.target.toLocaleString()}
              {row.category === "sessions" ? (row.target === 1 ? " session" : " sessions") : " pts"}
            </Text>
            <Text style={[f.small, { textAlign: "center", fontSize: 11, lineHeight: 16 }]}>{row.title}</Text>
            <Text style={[f.small, { fontSize: 10, color: row.earned ? c.green : c.muted }]}>
              {row.earned ? "✓ Earned" : "Up next"}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
