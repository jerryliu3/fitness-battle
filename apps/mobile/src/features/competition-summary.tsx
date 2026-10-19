import {
  competeNow,
  primaryFreezePeriodStart,
  formatWeeklyCompetitionRange,
  weeklyPeriodBounds,
  type CompeteState,
} from "@fitness-battle/shared";
import { Text, View } from "react-native";
import { f } from "../ui/focus";
export function CompetitionSummary({ state }: { state: CompeteState }) {
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
      <View style={[f.card, f.row]}>
        <View style={f.grow}>
          <Text style={f.kicker}>Competition</Text>
          <Text style={f.h2}>{weekLabel}</Text>
        </View>
        <Text style={f.rowTitle}>
          {days
            ? `${days} day${days === 1 ? "" : "s"}`
            : hours
              ? `${hours}h`
              : `${left}m`}{" "}
          left
        </Text>
      </View>
      {state.frozenPeriods.includes(primaryFreezePeriodStart(state)) ? (
        <Text style={f.copy}>
          ❄ Week frozen · Your effort score is protected through next Monday.
        </Text>
      ) : null}
    </>
  );
}
