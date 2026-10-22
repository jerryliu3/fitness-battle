"use client";
import { useId, useState } from "react";
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
  userId,
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
  userId?: string;
}) {
  const [selected, setSelected] = useState(""),
    prefix = useId();
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
    model.segments.find((m) => m.id === (selected || userId)) ??
    model.segments[0];
  const volume = (v: number) =>
    sessions
      ? `${v} session${v === 1 ? "" : "s"}`
      : formatVolume(sport, v, 0, units);
  const scale =
    model.target === null ? model.total : Math.max(model.total, model.target);
  return (
    <div className="crew-relay">
      <svg
        className="crew-relay-graphic"
        viewBox="0 0 360 148"
        role="group"
        aria-label={`${volume(model.total)} together${model.target ? ` of ${volume(model.target)}` : ""}. Choose a contribution.`}
      >
        <defs>
          <pattern
            id={`${prefix}-weave`}
            width="6"
            height="5"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 0H6"
              stroke="#282f2c"
              strokeOpacity=".12"
              strokeWidth="1"
            />
          </pattern>
          <pattern
            id={`${prefix}-finish`}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <rect width="8" height="8" fill="white" />
            <path d="M0 0H4V4H0ZM4 4H8V8H4Z" fill="#282f2c" />
          </pattern>
          <clipPath id={`${prefix}-tape`}>
            <rect x="14" y="36" width="332" height="66" rx="8" />
          </clipPath>
        </defs>
        <g transform="rotate(-4 180 69)">
          <rect x="14" y="44" width="332" height="66" rx="8" fill="#d4dacd" />
          <rect
            x="14"
            y="36"
            width="332"
            height="66"
            rx="8"
            fill="#eef0e9"
            stroke="#d7ddcf"
          />
          <g clipPath={`url(#${prefix}-tape)`}>
            {model.segments
              .filter((m) => m.value > 0)
              .map((m) => (
                <g
                  key={m.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${m.name}, ${volume(m.value)}`}
                  aria-pressed={member?.id === m.id}
                  onClick={() => setSelected(m.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(m.id);
                    }
                  }}
                  className="relay-contribution"
                >
                  <rect
                    x={14 + m.start * 332}
                    y="36"
                    width={m.fraction * 332}
                    height="66"
                    fill={member?.id === m.id ? "#f1c75b" : m.color}
                  />
                  <rect
                    x={14 + m.start * 332}
                    y="36"
                    width={m.fraction * 332}
                    height="66"
                    fill={`url(#${prefix}-weave)`}
                  />
                  <path
                    d={`M ${14 + m.start * 332} 38 V100`}
                    stroke="#ffffff90"
                    strokeWidth="2"
                  />
                  {m.fraction > 0.1 ? (
                    <text
                      x={14 + (m.start + m.fraction / 2) * 332}
                      y="73"
                      textAnchor="middle"
                      fill="#282f2c"
                      fontSize="11"
                      fontWeight="700"
                    >
                      {m.id === userId
                        ? "YOU"
                        : m.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                    </text>
                  ) : null}
                </g>
              ))}
          </g>
          {model.finish !== null ? (
            <>
              <rect
                x={Math.min(338, 14 + model.finish * 332 - 4)}
                y="25"
                width="8"
                height="89"
                fill={`url(#${prefix}-finish)`}
              />
              <path
                d={`M ${Math.min(342, 14 + model.finish * 332)} 25 v-9 h17 l-5 6 5 6 h-17`}
                fill="#282f2c"
              />
            </>
          ) : null}
        </g>
        <text x="14" y="140" fill="#616c63" fontSize="10">
          0
        </text>
        <text x="346" y="140" textAnchor="end" fill="#616c63" fontSize="10">
          {volume(scale)}
          {model.target !== null && model.total > model.target
            ? " · beyond goal"
            : ""}
        </text>
      </svg>
      <div
        className="crew-relay-members"
        role="group"
        aria-label="Crew contributions"
      >
        {model.segments.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={member?.id === m.id}
            aria-label={`Inspect ${m.name}'s contribution`}
            onClick={() => setSelected(m.id)}
          >
            <span style={{ background: m.color }}>
              {m.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </span>
            {m.id === userId ? "You" : m.name.split(" ")[0]}
          </button>
        ))}
      </div>
      {member ? (
        <div className="crew-relay-receipt" aria-live="polite">
          <span
            className="crew-relay-avatar"
            style={{ background: member.color }}
          >
            {member.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div>
            <strong>
              {member.id === userId ? "Your contribution" : member.name}
            </strong>
            <p>
              {volume(member.value)}
              {!sessions
                ? ` · ${member.sessions} session${member.sessions === 1 ? "" : "s"}`
                : ""}
            </p>
            <small>{(member.share * 100).toFixed(1)}% of the crew</small>
          </div>
        </div>
      ) : null}
    </div>
  );
}
