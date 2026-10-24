import { AppText, Section, SectionStack } from "../ui/section";
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
                  <Text>
                    {d.sport === "cycling" ? "Ride · " : ""}
                    {d.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <Text style={f.kicker}>
            {active.label} · {active.sport}
          </Text>
          <Text style={f.massive}>{formatClockTime(latest.seconds)}</Text>
          <RecordChart rows={rows} selected={inspected.activityId} now={now} onSelect={setReceipt} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={f.row}>
              {rows.map((r) => (
                <Pressable
                  key={r.activityId}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: inspected.activityId === r.activityId,
                  }}
                  style={[
                    f.chip,
                    inspected.activityId === r.activityId && f.chipActive,
                  ]}
                  onPress={() => setReceipt(r.activityId)}
                >
                  <Text>{date(r.startedAt)}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <AppText role="itemTitle" >
            {formatClockTime(inspected.seconds)} · {date(inspected.startedAt)}
          </AppText>
          <AppText role="caption" secondary >
            {inspected.source.replaceAll("_", " ")}
            {inspected.verified ? " · GPS recorded" : ""}
          </AppText>
        </Section>
      ) : null}
    </SectionStack>
  );
}
