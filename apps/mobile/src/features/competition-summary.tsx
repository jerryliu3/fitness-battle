import { useThemeColors } from "../theme";
import { useFocusStyles } from "../ui/focus";
import { AppText, StatusBadge, SectionHeader } from "../ui/section";
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
import { type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { SHELL_COLORS as c } from "../theme";
import { f } from "../ui/focus";
import { playCue } from "../lib/haptics";
export function CompetitionSummary({
  state,
  children,
  selectedSport,
  onRegister,
}: {
  state: CompeteState;
  children?: ReactNode;
  selectedSport?: SportId | "sleep";
  onRegister?: () => void;
}) {
  const c = useThemeColors();
  const f = useFocusStyles();

  const now = competeNow(state);
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
      <View style={f.section}>
        <SectionHeader
          titleRole="display"
          title={
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <AppText role="display" accessibilityRole="header">Compete</AppText>
              <StatusBadge>{days ? `${days} day${days === 1 ? "" : "s"}` : hours ? `${hours}h` : `${left}m`} left</StatusBadge>
            </View>
          }
          subtitle={weekLabel}
          action={
            onRegister ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Register for an event"
                onPress={() => {
                  void playCue("selection");
                  onRegister();
                }}
                style={{
                  minHeight: 36,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: c.soft,
                  borderWidth: 1,
                  borderColor: c.line,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <AppText role="label">＋ Register</AppText>
              </Pressable>
            ) : null
          }
        />

        {children}
      </View>
      {state.frozenPeriods.includes(primaryFreezePeriodStart(state)) ? (
        <AppText role="body" secondary >
          ❄ Week frozen · Your effort score is protected through next Monday.
        </AppText>
      ) : null}

    </>
  );
}
