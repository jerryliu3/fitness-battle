import { Section, SectionStack, StatusBadge, AppText } from "../ui/section";
import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import {
  achievementAccessibilityLabel,
  clubAchievements,
  sportById,
  type ClubAchievement,
  type CompeteState,
} from "@fitness-battle/shared";
import { AchievementMeter } from "./achievement-meter";
import { Achievements } from "./club-achievements";
import { f } from "../ui/focus";
import { SHELL_COLORS as c } from "../theme";

function Badge({ item }: { item: ClubAchievement }) {
  const fraction = item.target > 0 ? Math.min(1, item.current / item.target) : 0;
  const dash = Math.round(fraction * 150.8);
  const stroke = item.earned
    ? item.category === "effort"
      ? "#f7c948"
      : c.fieldTeal
    : "#9eb1b8";
  return (
    <View
      style={{
        width: 56,
        height: 56,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={56}
        height={56}
        viewBox="0 0 60 60"
        style={{ position: "absolute" }}
        accessible={Platform.OS === "web" ? undefined : false}
      >
        <Circle
          cx="30"
          cy="30"
          r="24"
          fill={item.earned ? "#142b3b" : c.paper}
          stroke={c.line}
          strokeWidth={5}
        />
        <Circle
          cx="30"
          cy="30"
          r="24"
          fill="none"
          stroke={stroke}
          strokeWidth={5}
          strokeDasharray={`${dash} 150.8`}
          strokeLinecap="round"
          rotation={-90}
          origin="30, 30"
        />
      </Svg>
      <AppText
        role="caption"
        style={{
          fontWeight: "800",
          color: item.earned ? "#f7c948" : c.ink,
        }}
      >
        {Math.round(fraction * 100)}%
      </AppText>
    </View>
  );
}

export function AchievementsCatalog({
  state,
  initialId,
}: {
  state: CompeteState;
  initialId?: string;
}) {
  const rows = clubAchievements(state);
  const [selected, setSelected] = useState(
    initialId && rows.some((row) => row.id === initialId)
      ? initialId
      : rows[0]?.id ?? "",
  );
  const item = rows.find((row) => row.id === selected) ?? rows[0];
  return (
    <ScrollView contentContainerStyle={[f.content, { paddingTop: 0, gap: 18, paddingBottom: 40 }]}>
      <SectionStack divided={false}>
        <Achievements state={state} />
        <Section title="All milestone tiers">
          {item ? (
            <View style={{ alignItems: "center", gap: 12 }}>
              <Badge item={item} />
              <AchievementMeter row={item} decorative={false} />
              <AppText role="heading">
                {Math.min(item.current, item.target).toLocaleString()} / {item.target.toLocaleString()}
              </AppText>
              <AppText role="body" secondary>
                {item.category === "sessions"
                  ? "Sessions currently in your activity history."
                  : `${sportById(state.primary).name} · Open Effort Score.`}
              </AppText>
              <AppText role="body" secondary>
                {item.earned
                  ? "Milestone reached. Keep building on it."
                  : `${Math.max(0, item.target - item.current)} ${item.category === "sessions" ? "sessions" : "points"} to this milestone.`}
              </AppText>
            </View>
          ) : null}
          <AppText role="caption" secondary>
            Milestones reflect your current activity history and score. They do not grant rewards or change competition points.
          </AppText>
          {rows.map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              accessibilityState={{ selected: row.id === item?.id }}
              accessibilityLabel={achievementAccessibilityLabel(row)}
              onPress={() => setSelected(row.id)}
              style={[f.row, { minHeight: 72 }]}
            >
              <Badge item={row} />
              <View style={f.grow}>
                <AppText role="label">{row.title}</AppText>
                <AchievementMeter row={row} />
                <AppText role="body" secondary>
                  {row.target} {row.category === "sessions" ? "sessions" : "Open effort score"}
                </AppText>
              </View>
              <StatusBadge tone={row.earned ? "success" : "neutral"}>
                {row.earned ? "Earned" : "Up next"}
              </StatusBadge>
            </Pressable>
          ))}
        </Section>
      </SectionStack>
    </ScrollView>
  );
}


export const achievementTileStyle = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    padding: 10,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    alignItems: "center",
    gap: 6,
  },
});
