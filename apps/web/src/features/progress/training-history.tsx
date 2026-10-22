"use client";
import { useState } from "react";
import { RecordChart } from "./record-chart";
import {
  APP_TIMEZONE,
  SPORTS,
  RECORD_DISTANCES,
  competeNow,
  formatClockTime,
  formatVolume,
  personalRecordHistory,
  weeklyTraining,
  type CompeteState,
  type SportId,
} from "@fitness-battle/shared";
const date = (v: string) =>
  new Date(v).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
export function TrainingHistory({ state }: { state: CompeteState }) {
  const [sport, setSport] = useState<SportId>(state.primary);
  const [selected, setSelected] = useState(11);
  const [distance, setDistance] = useState("");
  const now = competeNow(state),
    weeks = weeklyTraining(state.activities, sport, now);
  const week = weeks[selected] ?? weeks.at(-1)!;
  const value = (w: typeof week) =>
    sport === "strength" ? w.movingSec : w.distanceM;
  const max = Math.max(1, ...weeks.map(value));
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
    <>
      <section className="focus-card training-history">
        <div className="focus-row">
          <h2>Weekly training</h2>
          <label className="fb-field">
            <span className="sr-only">Training sport</span>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value as SportId)}
            >
              {SPORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          className="training-bars"
          role="group"
          aria-label="Weekly training totals"
        >
          {weeks.map((w, i) => (
            <button
              key={w.start}
              type="button"
              aria-pressed={selected === i}
              aria-label={`${date(w.start)}: ${formatVolume(sport, w.distanceM, w.movingSec, state.units)}${w.partial ? ", partial week" : ""}`}
              onClick={() => setSelected(i)}
            >
              <span
                className={w.partial ? "is-partial" : ""}
                style={{ height: `${Math.max(2, (value(w) / max) * 100)}%` }}
              />
              <small>{i % 3 === 0 || i === 11 ? date(w.start) : ""}</small>
            </button>
          ))}
        </div>
        <div className="focus-row" aria-live="polite">
          <div>
            <strong>
              {formatVolume(sport, week.distanceM, week.movingSec, state.units)}
            </strong>
            <p className="fb-copy">
              {date(week.start)} ·{" "}
              {week.partial ? "This week so far" : "Complete week"}
            </p>
          </div>
          <span>{week.sessions} sessions</span>
        </div>
      </section>
      {active && latest && inspected ? (
        <section className="focus-card record-history">
          <h2>Personal records</h2>
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
        </section>
      ) : null}
    </>
  );
}
