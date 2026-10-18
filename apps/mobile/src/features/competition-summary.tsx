import {
  APP_TIMEZONE,
  competeNow,
  primaryFreezePeriodStart,
  weeklyPeriodBounds,
  type CompeteState,
} from "@fitness-battle/shared";
import { Text, View } from "react-native";
import { f } from "../ui/focus";
export function CompetitionSummary({ state }: { state: CompeteState }) {
  const now = competeNow(state);
  const week = weeklyPeriodBounds(now);
  const left = Math.max(
    1,
    Math.ceil((week.endsAt.getTime() - now.getTime()) / 60000),
  );
  const days = Math.floor(left / 1440),
    hours = Math.floor(left / 60);
  const format = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: APP_TIMEZONE,
    });
  return (
    <>
      <View style={[f.card, f.row]}>
        <View style={f.grow}>
          <Text style={f.kicker}>Competition</Text>
          <Text style={f.h2}>
            {format(week.startsAt)} – {format(week.endsAt)}
          </Text>
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
