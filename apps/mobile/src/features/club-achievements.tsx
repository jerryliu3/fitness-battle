import { useId, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import {
  clubAchievements,
  featuredClubAchievements,
  sportById,
  type ClubAchievement,
  type CompeteState,
} from "@fitness-battle/shared";
import { FocusSheet, f } from "../ui/focus";
import { SHELL_COLORS as c } from "../theme";
function Badge({ item }: { item: ClubAchievement }) {
  const id = useId();
  return (
    <Svg width={64} height={70} viewBox="0 0 84 92" accessible={Platform.OS==="web"?undefined:false}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop
            stopColor={
              item.earned
                ? item.category === "effort"
                  ? "#ffe39a"
                  : "#6bbab2"
                : c.soft
            }
          />
          <Stop
            offset="1"
            stopColor={
              item.earned
                ? item.category === "effort"
                  ? "#e4a82b"
                  : c.fieldTeal
                : c.line
            }
          />
        </LinearGradient>
      </Defs>
      <Path
        d="M42 4 76 22v43L42 87 8 65V22Z"
        fill={`url(#${id})`}
        stroke={c.card}
        strokeWidth={3}
      />
      <Path
        d="M42 13 68 27v33L42 77 16 60V27Z"
        fill="none"
        stroke="#ffffff88"
        strokeWidth={2}
      />
      <Path
        d={
          item.category === "sessions"
            ? "m42 27 5 11 12 2-9 8 2 13-10-6-11 6 2-13-9-8 13-2Z"
            : "m46 23-18 26h12l-3 20 21-29H45Z"
        }
        fill={c.card}
      />
    </Svg>
  );
}
export function Achievements({ state }: { state: CompeteState }) {
  const rows = clubAchievements(state),
    featured = featuredClubAchievements(rows);
  const [selected, setSelected] = useState<string | null>(null),
    item = rows.find((row) => row.id === selected);
  return (
    <View style={{ gap: 12 }}>
      <View style={f.row}>
        <Text accessibilityRole="header" style={f.h2}>
          Achievements
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View all achievements"
          style={{ minHeight: 44, justifyContent: "center" }}
          onPress={() => setSelected(featured[0]!.id)}
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
            onPress={() => setSelected(row.id)}
            style={s.tile}
          >
            <Badge item={row} />
            <Text
              style={[
                f.rowTitle,
                {
                  textAlign: "center",
                  fontSize: 13,
                  fontFamily: "DMSans_700Bold",
                },
              ]}
            >
              {row.target.toLocaleString()}
              {row.category === "sessions"
                ? row.target === 1
                  ? " session"
                  : " sessions"
                : " pts"}
            </Text>
            <Text
              style={[
                f.small,
                { textAlign: "center", fontSize: 11, lineHeight: 16 },
              ]}
            >
              {row.title}
            </Text>
            <Text
              style={[
                f.small,
                { fontSize: 10, color: row.earned ? c.green : c.muted },
              ]}
            >
              {row.earned ? "✓ Earned" : "Up next"}
            </Text>
          </Pressable>
        ))}
      </View>
      <FocusSheet
        open={Boolean(item)}
        title={item?.title ?? "Achievements"}
        body="Everyday milestones, built by you."
        onClose={() => setSelected(null)}
      >
        {item ? (
          <>
            <View style={{ alignItems: "center", gap: 12 }}>
              <Badge item={item} />
              <Text style={f.h2}>
                {item.current.toLocaleString()} / {item.target.toLocaleString()}
              </Text>
              <Text style={f.copy}>
                {item.category === "sessions"
                  ? "Sessions currently in your activity history."
                  : `${sportById(state.primary).name} · Open Effort Score.`}
              </Text>
              <Text style={f.copy}>
                {item.earned
                  ? "Milestone reached. Keep building on it."
                  : `${Math.max(0, item.target - item.current)} ${item.category === "sessions" ? "sessions" : "points"} to this milestone.`}
              </Text>
            </View>
            <Text style={f.small}>
              Milestones reflect your current activity history and score. They do
              not grant rewards or change competition points.
            </Text>
            {rows.map((row) => (
              <Pressable
                key={row.id}
                accessibilityRole="button"
                accessibilityState={{ selected: row.id === item.id }}
                onPress={() => setSelected(row.id)}
                style={[f.row, { minHeight: 72 }]}
              >
                <Badge item={row} />
                <View style={f.grow}>
                  <Text style={f.rowTitle}>{row.title}</Text>
                  <Text style={f.small}>
                    {row.target}{" "}
                    {row.category === "sessions"
                      ? "sessions"
                      : "Open effort score"}{" "}
                    · {row.earned ? "Earned" : "Upcoming"}
                  </Text>
                </View>
              </Pressable>
            ))}
          </>
        ) : null}
      </FocusSheet>
    </View>
  );
}
const s = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    padding: 10,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    alignItems: "center",
    gap: 6,
  },
});
