import { competeNow, SPORTS, type Action, type CompeteState } from "@fitness-battle/shared";
import { Switch, View } from "react-native";
import { useThemeColors } from "../theme";
import { AppIcon } from "../ui/app-icon";
import { AppearanceControl } from "../ui/appearance-control";
import { ChoicePicker } from "../ui/choice-picker";
import { TimezonePicker } from "../ui/timezone-picker";
import { FocusSegments, useFocusStyles } from "../ui/focus";
import { HapticPreference } from "../ui/haptic-preference";
import { AppText, SectionHeader } from "../ui/section";
import { SportIcon } from "../ui/sport-icon";

export function AthletePreferencesFields({
  state,
  dispatch,
}: {
  state: CompeteState;
  dispatch: (action: Action) => void;
}) {
  const SHELL_COLORS = useThemeColors();
  const f = useFocusStyles();
  const nowMs = competeNow(state).getTime();

  return (
    <>
      <AppearanceControl />
      <HapticPreference />
      <View style={[f.row, { minHeight: 48, alignItems: "center", justifyContent: "space-between" }]}>
        <AppText role="label">Units</AppText>
        <View style={{ width: 170 }}>
          <FocusSegments
            label="Unit system"
            value={state.units}
            options={[{ value: "us", label: "Imperial" }, { value: "metric", label: "Metric" }]}
            onChange={(units) => dispatch({ type: "set-units", units })}
          />
        </View>
      </View>
      <TimezonePicker
        label="Time zone"
        value={state.timezone}
        onChange={(timezone) => dispatch({ type: "set-timezone", timezone })}
      />
      <View style={[f.row, { minHeight: 48, alignItems: "center", justifyContent: "space-between" }]}>
        <AppText role="label">Primary sport</AppText>
        <ChoicePicker
          systemMenu
          label="Primary sport"
          value={state.primary}
          options={SPORTS.map((s) => ({ value: s.id, label: s.name }))}
          onChange={(sport) => dispatch({ type: "set-primary", sport })}
        />
      </View>
      <SectionHeader title="Active Sports (auto-registration)" />
      <AppText role="caption" secondary>
        Turn on to auto-register for the event every week. Turning off will not remove you from any active events.
      </AppText>
      {SPORTS.map((sport) => {
        const enrollment = state.enrollments.find((e) => e.sport === sport.id);
        const active = Boolean(state.ratings.find((r) => r.sport === sport.id)?.optedIn) && enrollment?.autoEnrollNext !== false;
        const queued = enrollment && Date.parse(enrollment.waveStart) > nowMs;
        return (
          <View key={sport.id} style={[f.row, { minHeight: 64, alignItems: "center", borderBottomWidth: 1, borderBottomColor: SHELL_COLORS.line }]}>
            <View style={[f.row, f.grow, { justifyContent: "flex-start", gap: 10 }]}>
              <SportIcon sport={sport.id} />
              <AppText role="label">{sport.name}</AppText>
            </View>
            <Switch
              style={{ alignSelf: "center", marginVertical: 0 }}
              trackColor={{ false: SHELL_COLORS.line, true: SHELL_COLORS.ink }}
              thumbColor="#ffffff"
              ios_backgroundColor={SHELL_COLORS.line}
              accessibilityLabel={`Toggle ${sport.name} active status`}
              value={active}
              onValueChange={(enabled) =>
                dispatch(
                  enabled
                    ? enrollment
                      ? { type: "resume-renewal", sport: sport.id }
                      : { type: "opt-in", sport: sport.id, crewBoard: null }
                    : { type: queued ? "opt-out" : "schedule-leave", sport: sport.id },
                )
              }
            />
          </View>
        );
      })}
      {(() => {
        const sleepRating = state.healthRatings.find((r) => r.metric === "sleep");
        const sleepQueued = Boolean(sleepRating && Date.parse(sleepRating.lockPeriod) > nowMs);
        const sleepActive = Boolean(sleepRating?.optedIn) && (sleepQueued || sleepRating?.autoEnrollNext !== false);
        return (
          <View style={[f.row, { minHeight: 64, alignItems: "center", borderBottomWidth: 1, borderBottomColor: SHELL_COLORS.line }]}>
            <View style={[f.row, f.grow, { justifyContent: "flex-start", gap: 10 }]}>
              <AppIcon name="sleep" size={20} color={SHELL_COLORS.ink} />
              <AppText role="label">Recovery / Sleep</AppText>
            </View>
            <Switch
              style={{ alignSelf: "center", marginVertical: 0 }}
              trackColor={{ false: SHELL_COLORS.line, true: SHELL_COLORS.ink }}
              thumbColor="#ffffff"
              ios_backgroundColor={SHELL_COLORS.line}
              accessibilityLabel="Toggle Recovery / Sleep active status"
              value={sleepActive}
              onValueChange={(enabled) =>
                dispatch(
                  enabled
                    ? sleepRating?.optedIn
                      ? { type: "resume-renewal", metric: "sleep" }
                      : { type: "opt-in-health", metric: "sleep" }
                    : { type: sleepQueued ? "opt-out-health" : "schedule-leave", metric: "sleep" },
                )
              }
            />
          </View>
        );
      })()}
    </>
  );
}
