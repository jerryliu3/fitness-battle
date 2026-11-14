import { createThemedStyles, useThemedStyles } from "../theme";
import { useState } from "react";
import { homeTrainingLine, type CompeteState } from "@fitness-battle/shared";
import { Pressable, View } from "react-native";
import { useAuth } from "../lib/auth";
import { AppText } from "../ui/section";
import { OpenLineChart } from "../ui/open-line-chart";
import { ChartFrame } from "../ui/chart-frame";
import { HomeActivityActions } from "./home-activity-actions";

export function WeekChart({
  state,
  onOpen,
  ready = true,
}: {
  state: CompeteState;
  onOpen?: () => void;
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
            Your effort
          </AppText>
          <HomeActivityActions compact />
        </View>
        <OpenLineChart
          openHero
          showDateRange={false}
          showAxes={true}
          key={range}
          chart={chart}
          label="Cumulative training hours"
          unit="hrs"
          range={range}
          onRangeChange={(next) => {
            if (next === "week" || next === "fourWeeks") setRange(next);
          }}
          includeYear={false}
          footerAction={
            onOpen ? (
              <Pressable
                accessibilityRole="button"
                onPress={onOpen}
                style={s.open}
              >
                <AppText role="label">View week →</AppText>
              </Pressable>
            ) : undefined
          }
        />
      </View>
    </ChartFrame>
  );
}

const sThemes = createThemedStyles(() => ({
  card: { paddingTop: 12, paddingBottom: 2, gap: 12 },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  open: { minHeight: 44, justifyContent: "center", alignSelf: "flex-end" },
}));
