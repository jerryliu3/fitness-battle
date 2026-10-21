"use client";
import { useState } from "react";
import {
  crewRelay,
  formatVolume,
  type SportId,
  type UnitSystem,
} from "@fitness-battle/shared";
export function CrewRelay({
  members,
  entries,
  sport,
  format,
  targetM,
  targetSessions,
  units,
}: {
  members: { user_id: string; display_name: string }[];
  entries: {
    user_id: string;
    distance_m: number;
    moving_sec: number;
    session_count?: number;
  }[];
  sport: SportId;
  format: string;
  targetM: number;
  targetSessions: number;
  units?: UnitSystem;
}) {
  const [selected, setSelected] = useState("");
  const sessions = format === "personal_target" || sport === "strength";
  const model = crewRelay(
    members.map((m) => {
      const rows = entries.filter((e) => e.user_id === m.user_id);
      return {
        id: m.user_id,
        name: m.display_name,
        value: rows.reduce(
          (t, e) =>
            t + Number(sessions ? (e.session_count ?? 1) : e.distance_m),
          0,
        ),
        sessions: rows.reduce((t, e) => t + Number(e.session_count ?? 1), 0),
      };
    }),
    sessions
      ? targetSessions * members.length
      : format === "cooperative"
        ? targetM
        : null,
  );
  const member =
    model.segments.find((m) => m.id === selected) ?? model.segments[0];
  const volume = (v: number) =>
    sessions ? `${v} sessions` : formatVolume(sport, v, 0, units);
  return (
    <div className="crew-relay">
      <div
        className="crew-relay-tape"
        role="img"
        aria-label={`${volume(model.total)} together${model.target ? ` of ${volume(model.target)}` : ""}`}
      >
        {model.segments.map((m) => (
          <span
            key={m.id}
            style={{ width: `${m.fraction * 100}%`, background: m.color }}
          >
            {m.fraction > 0.12 ? m.name.slice(0, 2).toUpperCase() : ""}
          </span>
        ))}
        {model.finish !== null ? (
          <i style={{ left: `${model.finish * 100}%` }} />
        ) : null}
      </div>
      {member ? (
        <>
          <label className="fb-field">
            <span className="sr-only">Inspect crew contribution</span>
            <select
              value={member.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {model.segments.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <p aria-live="polite">
            <b>{volume(member.value)}</b> · {(member.share * 100).toFixed(1)}%
            of the crew
            {!sessions
              ? ` · ${member.sessions} session${member.sessions === 1 ? "" : "s"}`
              : ""}
          </p>
        </>
      ) : null}
    </div>
  );
}
