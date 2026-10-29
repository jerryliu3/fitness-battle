import { useThemeColors } from "../theme";
import { useFocusStyles } from "../ui/focus";
import { AppText, SectionHeader } from "../ui/section";
import { clubLifetimeTotals } from "@fitness-battle/shared";
import { SHELL_COLORS as clubColors } from "@fitness-battle/shared";
import { distanceUnitLabel, formatDistanceM, type CompeteState } from "@fitness-battle/shared";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { IconButton } from "../ui/icon-button";
import { FocusButton, f } from "../ui/focus";
import { EffortTrend } from "./effort-trend";
import { ProfilePhoto } from "./profile-photo";

export function AthleteMetrics({
  state,
  email,
  offlineMode,
  onEdit,
  sections = "progress",
}: {
  state: CompeteState;
  email?: string | null;
  offlineMode?: boolean;
  onEdit?: () => void;
  sections?: "profile" | "progress";
}) {
  const clubColors = useThemeColors();
  const f = useFocusStyles();

  const router = useRouter();
  const season = clubLifetimeTotals(state);
  const unit = distanceUnitLabel(state.units);
  return (
    <>
      {sections === "profile" ? (
        <>
          <View
            style={[
              f.section,
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                marginVertical: 8,
              },
            ]}
          >
            <ProfilePhoto state={state} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={f.kicker}>{state.city || "Your own pace"}</Text>
              <AppText accessibilityRole="header" role="display" >{state.name}</AppText>
              {email ? (
                <AppText role="caption" secondary >
                  {email}
                </AppText>
              ) : null}
            </View>
            {onEdit ? <IconButton icon="edit" label="Edit profile" onPress={onEdit} /> : null}
          </View>
        </>
      ) : (
        <>
          <View
            style={[
              f.card,
              { backgroundColor: clubColors.soft, borderColor: clubColors.line },
            ]}
            accessibilityLabel="Lifetime totals"
          >
            <SectionHeader title="Lifetime totals"/>
            <View style={[f.row, { marginTop: 12, flexWrap: "wrap" }]}>
              <View
                style={{
                  flex: 1,
                  flexBasis: "40%",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <AppText role="metric" >
                  {formatDistanceM(season.meters, state.units)}
                </AppText>
                <AppText role="caption" secondary >{unit} total</AppText>
              </View>
              <View
                style={{
                  flex: 1,
                  flexBasis: "40%",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <AppText role="metric" >{season.sessions}</AppText>
                <AppText role="caption" secondary >sessions</AppText>
              </View>
              <View
                style={{
                  flex: 1,
                  flexBasis: "40%",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <AppText role="metric" >{season.weeks}</AppText>
                <AppText role="caption" secondary >settled weeks</AppText>
              </View>
              <View
                style={{
                  flex: 1,
                  flexBasis: "40%",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <AppText role="metric" >{state.lifetimeOvertakes}</AppText>
                <AppText role="caption" secondary >overtakes</AppText>
              </View>
            </View>
          </View>
          <EffortTrend state={state} />
          <FocusButton
            label="Your benchmarks · pace & rankings"
            secondary
            onPress={() => router.push("/benchmarks")}
          />
        </>
      )}
    </>
  );
}
