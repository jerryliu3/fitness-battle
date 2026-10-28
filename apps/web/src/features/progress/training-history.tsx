"use client";
import { ActivityRoute } from "@/components/routes/activity-route";
import { AppParagraph, AppText, Section, SectionStack, StatusBadge } from "@/ui/section";
import { TrainingAtlas } from "./training-atlas";
import { useState, type ReactNode } from "react";
import { RecordChart } from "./record-chart";
import {
  APP_TIMEZONE,
  RECORD_DISTANCES,
  competeNow,
  formatClockTime,
  personalRecordHistory,
  type CompeteState,
} from "@fitness-battle/shared";
const date = (v: string) =>
  new Date(v).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
export function TrainingHistory({ state, children }: { state: CompeteState; children?: ReactNode }) {
  const [distance, setDistance] = useState("");
  const now=competeNow(state);
  const records = personalRecordHistory(state, now);
  const available = (["running", "cycling"] as const).flatMap((s) =>
    RECORD_DISTANCES[s]
      .filter((d) =>
        records.some((r) => r.sport === s && r.distanceId === d.id),
      )
      .map((d) => ({ ...d, sport: s })),
  );
  const active =
    available.find((d) => `${d.sport}:${d.id}` === distance) ?? available[0];
  const rows = active
    ? records.filter(
        (r) => r.sport === active.sport && r.distanceId === active.id,
      )
    : [];
  const [receipt, setReceipt] = useState<string | null>(null);
  const latest = rows.at(-1),
    inspected = rows.find((r) => r.activityId === receipt) ?? latest;
  return (
    <SectionStack>
      <TrainingAtlas state={state} />
      {children}
      {active && latest && inspected ? (
        <Section title="Personal records" className="record-history">
          <div
            className="record-distance-tabs"
            role="group"
            aria-label="Record distance"
          >
            {available.map((d) => (
              <button
                type="button"
                className="fb-btn-ghost"
                key={`${d.sport}:${d.id}`}
                aria-pressed={active === d}
                onClick={() => {
                  setDistance(`${d.sport}:${d.id}`);
                  setReceipt(null);
                }}
              >
                {d.sport === "cycling" ? "Ride · " : "Run · "}
                {d.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "6px 0 10px", flexWrap: "wrap" }}>
            <AppText role="hero" className="record-time">
              {formatClockTime(inspected.seconds)}
            </AppText>
            <StatusBadge tone={inspected.verified ? "success" : "neutral"}>
              {inspected.source.replaceAll("_", " ")}
              {inspected.verified ? " · GPS recorded" : ""}
            </StatusBadge>
          </div>
          <RecordChart rows={rows} selected={inspected.activityId} now={now} onSelect={setReceipt} />
          <ActivityRoute units={state.units} key={inspected.activityId} activity={state.activities.find(a => a.id === inspected.activityId)} milestone />
        </Section>
      ) : null}
    </SectionStack>
  );
}
