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
  const router = useRouter();
  const season = clubLifetimeTotals(state);
  const unit = distanceUnitLabel(state.units);
  return (
    <>
      {sections === "profile" ? (
        <>
          <View
            style={[
              f.card,
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
              <Text style={f.title}>{state.name}</Text>
              {email ? (
                <Text style={f.small}>
                  {email}
                  {offlineMode ? " · demo" : ""}
                </Text>
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
            <Text style={f.kicker}>Lifetime totals</Text>
            <View style={[f.row, { marginTop: 12, flexWrap: "wrap" }]}>
              <View
                style={{
                  flex: 1,
                  flexBasis: "40%",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Text style={f.h2}>
                  {formatDistanceM(season.meters, state.units)}
                </Text>
                <Text style={f.small}>{unit} total</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  flexBasis: "40%",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Text style={f.h2}>{season.sessions}</Text>
                <Text style={f.small}>sessions</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  flexBasis: "40%",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Text style={f.h2}>{season.weeks}</Text>
                <Text style={f.small}>settled weeks</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  flexBasis: "40%",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Text style={f.h2}>{state.lifetimeOvertakes}</Text>
                <Text style={f.small}>overtakes</Text>
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
