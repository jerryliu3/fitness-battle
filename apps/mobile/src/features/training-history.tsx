import { useFocusStyles } from "../ui/focus";
import { ActivityRoute } from "../ui/activity-route";
import { AppText, Section, SectionStack, StatusBadge } from "../ui/section";
import { TrainingAtlas } from "./training-atlas";
import { useState, type ReactNode } from "react";
import { RecordChart } from "./record-chart";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  APP_TIMEZONE,
  RECORD_DISTANCES,
  competeNow,
  formatClockTime,
  personalRecordHistory,
  type CompeteState,
} from "@fitness-battle/shared";
import { f } from "../ui/focus";
import { SHELL_COLORS as c } from "../theme";
const date = (v: string) =>
  new Date(v).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
export function TrainingHistory({ state, children }: { state: CompeteState; children?: ReactNode }) {
  const f = useFocusStyles();

  const [distance,setDistance]=useState(""),[receipt,setReceipt]=useState<string|null>(null);
  const now=competeNow(state);
  const records = personalRecordHistory(state, now),
    available = (["running", "cycling"] as const).flatMap((s) =>
      RECORD_DISTANCES[s]
        .filter((d) =>
          records.some((r) => r.sport === s && r.distanceId === d.id),
        )
        .map((d) => ({ ...d, sport: s })),
    );
  const active =
      available.find((d) => `${d.sport}:${d.id}` === distance) ?? available[0],
    rows = active
      ? records.filter(
          (r) => r.sport === active.sport && r.distanceId === active.id,
        )
      : [],
    latest = rows.at(-1),
    inspected = rows.find((r) => r.activityId === receipt) ?? latest;
  return (
    <SectionStack>
      <TrainingAtlas state={state} />
      {children}
      {active && latest && inspected ? (
        <Section title="Personal records">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={f.row}>
              {available.map((d) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active === d }}
                  style={[f.chip, active === d && f.chipActive]}
                  key={`${d.sport}:${d.id}`}
                  onPress={() => {
                    setDistance(`${d.sport}:${d.id}`);
                    setReceipt(null);
                  }}
                >
                  <AppText role="label">
                    {d.sport === "cycling" ? "Ride · " : "Run · "}
                    {d.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 6, flexWrap: "wrap" }}>
            <Text style={f.massive}>{formatClockTime(inspected.seconds)}</Text>
            <StatusBadge tone={inspected.verified ? "success" : "neutral"}>
              {inspected.source.replaceAll("_", " ")}
              {inspected.verified ? " · GPS recorded" : ""}
            </StatusBadge>
          </View>
          <RecordChart rows={rows} selected={inspected.activityId} now={now} onSelect={setReceipt} />
          <ActivityRoute units={state.units} key={inspected.activityId} activity={state.activities.find(a => a.id === inspected.activityId)} milestone />
        </Section>
      ) : null}
    </SectionStack>
  );
}
