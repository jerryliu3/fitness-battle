"use client";
import { ActivityRoute } from "@/components/routes/activity-route";
import { Section, SectionStack } from "@/ui/section";
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
                {d.sport === "cycling" ? "Ride · " : ""}
                {d.label}
              </button>
            ))}
          </div>
          <p className="fb-kicker">
            {active.label} · {active.sport}
          </p>
          <strong className="record-time">
            {formatClockTime(latest.seconds)}
          </strong>
          <RecordChart rows={rows} selected={inspected.activityId} now={now} onSelect={setReceipt} />
          <div
            className="record-distance-tabs"
            role="group"
            aria-label="Inspect record milestone"
          >
            {rows.map((r) => (
              <button
                type="button"
                key={r.activityId}
                className="fb-btn-ghost"
                aria-pressed={inspected.activityId === r.activityId}
                onClick={() => setReceipt(r.activityId)}
              >
                {date(r.startedAt)}
              </button>
            ))}
          </div>
          <div aria-live="polite">
            <b>{formatClockTime(inspected.seconds)}</b> ·{" "}
            {date(inspected.startedAt)}
            <p className="fb-copy">
              {inspected.source.replaceAll("_", " ")}
              {inspected.verified ? " · GPS recorded" : ""}
            </p>
          </div>
          <ActivityRoute units={state.units} key={inspected.activityId} activity={state.activities.find(a => a.id === inspected.activityId)} milestone />
        </Section>
      ) : null}
    </SectionStack>
  );
}
