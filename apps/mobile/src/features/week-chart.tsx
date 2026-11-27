import { useState } from "react";
import { homeTrainingLine, type CompeteState, type OpenLineRange } from "@fitness-battle/shared";
import { View } from "react-native";
import { useAuth } from "../lib/auth";
import { createThemedStyles, useThemedStyles } from "../theme";
import { ChartFrame } from "../ui/chart-frame";
import { OpenLineChart } from "../ui/open-line-chart";
import { AppText } from "../ui/section";
import { OpenLineRangeToggle } from "./chart-range-toggle";

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
  function changeRange(next: OpenLineRange) {
    if (next === "week" || next === "fourWeeks") setRange(next);
  }
  const chart = homeTrainingLine(state, range, undefined, user?.createdAt);
  return (
    <ChartFrame ready={ready}>
      <View style={s.card}>
        <View style={s.header}>
          <AppText role="display" accessibilityRole="header" style={s.title}>
            This week
          </AppText>
          <View style={s.range}>
            <OpenLineRangeToggle value={range} onChange={changeRange} includeYear={false} />
          </View>
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
          onRangeChange={changeRange}
          hideRangeToggle
        />
      </View>
    </ChartFrame>
  );
}

const sThemes = createThemedStyles(() => ({
  card: { paddingTop: 12, paddingBottom: 0, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { flexShrink: 1 },
  range: { flexShrink: 0 },
}));
