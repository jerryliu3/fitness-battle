import {
  competeNow,
  APP_TIMEZONE,
  competePeriodWindow,
  primaryFreezePeriodStart,
  weeklyCompetitionLastDay,
  weeklyPeriodBounds,
  type CompeteState,
  type SportId,
} from "@fitness-battle/shared";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { SHELL_COLORS as c } from "../theme";
import { FocusSheet, f } from "../ui/focus";
export function CompetitionSummary({
  state,
  children,
  selectedSport,
}: {
  state: CompeteState;
  children?: ReactNode;
  selectedSport?: SportId | "sleep";
}) {
  const now = competeNow(state);
  const [infoOpen, setInfoOpen] = useState(false);
  const active = state.ratings.filter((rating) => rating.optedIn);
  const sport = selectedSport === "sleep" ? undefined : selectedSport ??
    active.find((rating) => rating.sport === state.primary)?.sport ??
    active[0]?.sport;
  const period = sport
    ? competePeriodWindow(state, now, sport)
    : weeklyPeriodBounds(now);
  const dateOptions = {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  } as const;
  const weekLabel = `${period.startsAt.toLocaleDateString("en-US", dateOptions)} – ${weeklyCompetitionLastDay(period.endsAt).toLocaleDateString("en-US", dateOptions)}`;
  const weekEnd = period.endsAt;
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
          <View style={[f.grow, { gap: 6 }]}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <Text style={f.sectionTitle}>Competition · {weekLabel}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="About competition scoring"
                onPress={() => setInfoOpen(true)}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={f.copy}>ⓘ</Text>
              </Pressable>
            </View>
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
      <FocusSheet
        open={infoOpen}
        title="About competition scoring"
        onClose={() => setInfoOpen(false)}
      >
        <Text style={f.copy}>
          Running and cycling use GPS Tracked activities from a connected tracker. Walking and strength include manual activity.
        </Text>
      </FocusSheet>
    </>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: c.card,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  pill: {
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: c.soft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: c.muted,
  },
});
