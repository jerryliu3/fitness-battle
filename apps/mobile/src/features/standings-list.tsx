import Animated, { LinearTransition } from "react-native-reanimated";
import { Pressable, Text, View } from "react-native";
import { standingsBar, rankSymbolForScore } from "@fitness-battle/shared";
import { useThemeColors } from "../theme";
import { useFocusStyles } from "../ui/focus";
import { RankAvatar } from "../ui/rank-symbol";
import { AppText, textStyle } from "../ui/section";
import { useReducedMotion } from "../ui/use-reduced-motion";

export interface StandingsRowItem {
  id: string;
  name: string;
  avatarUrl?: string | null;
  you?: boolean;
  value: number;
}

/** Shared ranked athlete standings list used in both Compete and Overtake Replay. */
export function StandingsList<T extends StandingsRowItem>({
  ranked,
  hiddenIds = [],
  unit,
  scores = [],
  onSelectAthlete,
  onOpenProfile,
}: {
  ranked: readonly T[];
  hiddenIds?: readonly string[];
  unit: string;
  scores?: readonly { id: string; elo?: number | null }[];
  onSelectAthlete?: (lane: T) => void;
  onOpenProfile?: (lane: T, rank: number) => void;
}) {
  const c = useThemeColors();
  const f = useFocusStyles();
  const reduceMotion = useReducedMotion();
  const leaderValue = Math.max(ranked[0]?.value ?? 0, 0.0001);
  const place = (value: number) => 1 + ranked.filter((lane) => lane.value > value).length;
  const decimals = unit === "pts" ? 1 : 2;

  return (
    <View style={{ gap: 10 }}>
      {ranked.map((lane) => {
        if (hiddenIds.includes(lane.id)) {
          return (
            <View
              key={lane.id}
              style={{ minHeight: 72 }}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          );
        }
        const rank = place(lane.value);
        const bar = standingsBar(lane.value, leaderValue, rank);
        const elo = scores.find((row) => row.id === lane.id)?.elo;
        return (
          <Animated.View
            key={lane.id}
            layout={reduceMotion ? undefined : LinearTransition.duration(240)}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${lane.name}, place ${rank}, ${lane.value.toFixed(decimals)} ${unit}`}
              onPress={() => onSelectAthlete?.(lane)}
              style={[
                f.row,
                {
                  paddingVertical: 10,
                  paddingHorizontal: 10,
                  borderRadius: 12,
                  backgroundColor: lane.you ? c.soft : "transparent",
                },
              ]}
            >
              <Text style={[textStyle("label"), { width: 22, color: c.ink }]}>{rank}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${lane.name}'s profile`}
                onPress={(event) => {
                  event.stopPropagation();
                  onOpenProfile?.(lane, rank);
                }}
                hitSlop={4}
                style={{ overflow: "visible" }}
              >
                <RankAvatar
                  rank={rankSymbolForScore(elo)}
                  src={lane.avatarUrl}
                  name={lane.name}
                  size={56}
                />
              </Pressable>
              <View style={[f.grow, { gap: 6 }]}>
                <View style={[f.row, { alignItems: "center", justifyContent: "space-between" }]}>
                  <View style={{ flex: 1, gap: 2, marginRight: 12 }}>
                    <AppText role="label" numberOfLines={1}>
                      {lane.name}
                    </AppText>
                    <Text style={[textStyle("caption"), { color: c.muted }]}>
                      {elo ?? "—"} effort score
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ ...textStyle("heading"), color: c.ink }}>
                      {lane.value.toFixed(decimals)} {unit}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    height: 6,
                    borderRadius: 999,
                    backgroundColor: c.line,
                    overflow: "hidden",
                  }}
                >
                  <Animated.View
                    layout={reduceMotion ? undefined : LinearTransition.duration(180)}
                    style={{
                      width: `${bar.percent}%`,
                      height: "100%",
                      borderRadius: 999,
                      backgroundColor: bar.color,
                    }}
                  />
                </View>
              </View>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}
