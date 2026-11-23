import { useState } from "react";
import { homeTrainingLine, type CompeteState } from "@fitness-battle/shared";
import { View } from "react-native";
import { useAuth } from "../lib/auth";
import { createThemedStyles, useThemedStyles } from "../theme";
import { ChartFrame } from "../ui/chart-frame";
import { OpenLineChart } from "../ui/open-line-chart";
import { AppText } from "../ui/section";
import { HomeActivityActions } from "./home-activity-actions";

export function WeekChart({
  state,
  ready = true,
}: {
  state: CompeteState;
  ready?: boolean;
}) {
  const s = useThemedStyles(sThemes);
  const { user } = useAuth();

  const [range, setRange] = useState<"week" | "fourWeeks">("week");
  const chart = homeTrainingLine(state, range, undefined, user?.createdAt);
  return (
    <ChartFrame ready={ready}>
      <View style={s.card}>
        <View style={s.header}>
          <AppText role="display" accessibilityRole="header">
            This week
          </AppText>
          <HomeActivityActions compact />
        </View>
        <OpenLineChart
          openHero
          showDateRange={false}
          showAxes={true}
          live
          chart={chart}
          label="Cumulative training hours"
          unit="hrs"
          range={range}
          onRangeChange={(next) => {
            if (next === "week" || next === "fourWeeks") setRange(next);
          }}
          includeYear={false}
        />
      </View>
    </ChartFrame>
  );
}

const sThemes = createThemedStyles(() => ({
  card: { paddingTop: 12, paddingBottom: 0, gap: 8 },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
}));
