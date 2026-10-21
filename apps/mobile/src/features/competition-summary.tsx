import {
  competeNow,
  primaryFreezePeriodStart,
  formatWeeklyCompetitionRange,
  weeklyPeriodBounds,
  type CompeteState,
} from "@fitness-battle/shared";
import type { ReactNode } from "react";
import { Text, View, StyleSheet } from "react-native";
import { SHELL_COLORS as c } from "../theme";
import { f } from "../ui/focus";
export function CompetitionSummary({ state, children }: { state: CompeteState; children?: ReactNode }) {
  const now = competeNow(state);
  const weekLabel = formatWeeklyCompetitionRange(now);
  const weekEnd = weeklyPeriodBounds(now).endsAt;
  const left = Math.max(
    1,
    Math.ceil((weekEnd.getTime() - now.getTime()) / 60000),
  );
  const days = Math.floor(left / 1440),
    hours = Math.floor(left / 60);
  return (
    <>
      <View style={s.card}>
        <View style={f.row}>
          <View style={f.grow}>
            <Text style={f.kicker}>Competition</Text>
            <Text style={s.dates}>{weekLabel}</Text>
          </View>
          <Text style={s.pill}>
            {days
              ? `${days} day${days === 1 ? "" : "s"}`
              : hours
                ? `${hours}h`
                : `${left}m`}{" "}
            left
          </Text>
        </View>
        {children}
      </View>
      {state.frozenPeriods.includes(primaryFreezePeriodStart(state)) ? (
        <Text style={f.copy}>
          ❄ Week frozen · Your effort score is protected through next Monday.
        </Text>
      ) : null}
    </>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 18, padding: 16, gap: 14 },
  dates: { fontFamily: "DMSans_700Bold", fontSize: 16, lineHeight: 24, color: c.ink },
  pill: { overflow: "hidden", borderRadius: 12, backgroundColor: c.soft, paddingHorizontal: 10, paddingVertical: 5, fontFamily: "DMSans_500Medium", fontSize: 11, color: c.muted },
});
