"use client";
import { useId, useLayoutEffect, useRef, useState } from "react";
import {
  crewRelay,
  crewRelayScene,
  formatVolume,
  PERSON_ICON_PATH,
  type SportId,
  type UnitSystem,
} from "@fitness-battle/shared";
import { drawFieldNode } from "@/features/field/components/field-course";
export function CrewRelay({
  members,
  entries,
  sport,
  format,
  previousDistanceM,
  targetDistanceM,
  targetSessions,
  units,
  userId,
}: {
  members: {
    user_id: string;
    display_name: string;
    avatar_url?: string | null;
  }[];
  entries: {
    user_id: string;
    distance_m: number;
    moving_sec: number;
    session_count?: number;
  }[];
  sport: SportId;
  format: string;
  previousDistanceM?: number | null;
  targetDistanceM?: number | null;
  targetSessions: number;
  units?: UnitSystem;
  userId?: string;
}) {
  const [selected, setSelected] = useState(""),
    [width, setWidth] = useState(320),
    host = useRef<HTMLDivElement>(null),
    prefix = useId();
  const sessions = format === "personal_target" || sport === "strength";
  const distanceTarget =
    format === "cooperative" && targetDistanceM && targetDistanceM > 0
      ? targetDistanceM
      : null;
  const target = sessions
    ? targetSessions * members.length
    : (distanceTarget ??
      (previousDistanceM && previousDistanceM > 0 ? previousDistanceM : null));
  const model = crewRelay(
    members.map((m) => {
      const rows = entries.filter((e) => e.user_id === m.user_id);
      return {
        id: m.user_id,
        name: m.display_name,
        value: rows.reduce(
          (sum, e) =>
            sum + Number(sessions ? (e.session_count ?? 1) : e.distance_m),
          0,
        ),
        sessions: rows.reduce(
          (sum, e) => sum + Number(e.session_count ?? 1),
          0,
        ),
      };
    }),
    target,
  );
  const member =
      model.segments.find((m) => m.id === (selected || userId)) ??
      model.segments[0],
    scene = crewRelayScene(model, width, prefix);
  const volume = (value: number) =>
    sessions ? `${value} sessions` : formatVolume(sport, value, 0, units);
  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="crew-dimensional-relay" ref={host}>
      <div className="crew-relay-context">
        <span>
          {target
            ? sessions
              ? "Shared session target"
              : distanceTarget
                ? "Shared distance target"
                : "Last week’s distance"
            : previousDistanceM === 0
              ? "No distance recorded last week"
              : "Last-week comparison unavailable"}
        </span>
        {target ? <b>{volume(target)}</b> : null}
      </div>
      <svg
        width="100%"
        height={132}
        viewBox={`0 0 ${width} 132`}
        aria-label={`${volume(model.total)} together${target ? ` compared with ${volume(target)}` : ""}`}
      >
        {scene.ground.map(drawFieldNode)}
        {scene.segments.map((segment) => (
          <g
            key={segment.id}
            role="button"
            tabIndex={0}
            aria-label={`Inspect ${model.segments.find((m) => m.id === segment.id)?.name}'s contribution`}
            aria-pressed={member?.id === segment.id}
            onClick={() => setSelected(segment.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelected(segment.id);
              }
            }}
          >
            {segment.nodes.map(drawFieldNode)}
          </g>
        ))}
        {scene.finish.map(drawFieldNode)}
        {target ? (
          <text
            x={Math.min(
              width - 12,
              16 + (model.finish ?? 1) * Math.max(180, width - 52),
            )}
            y={126}
            textAnchor="end"
            fill="#616c63"
            fontSize={11}
          >
            {sessions || distanceTarget ? "Target" : "Last week"}
          </text>
        ) : null}
      </svg>
      <div
        className="crew-member-shelf"
        role="group"
        aria-label="Crew contributions"
      >
        {model.segments.map((m) => {
          const person = members.find((p) => p.user_id === m.id);
          return (
            <button
              type="button"
              key={m.id}
              aria-pressed={member?.id === m.id}
              onClick={() => setSelected(m.id)}
            >
              <span
                className="crew-member-photo"
                style={{ boxShadow: `0 0 0 3px ${m.color}` }}
              >
                {person?.avatar_url ? (
                  <img src={person.avatar_url} alt="" />
                ) : (
                  <svg
                    width={22}
                    height={22}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  >
                    <path d={PERSON_ICON_PATH} />
                  </svg>
                )}
              </span>
              <b>{m.name}</b>
              <small>{volume(m.value)}</small>
            </button>
          );
        })}
      </div>
      {member ? (
        <p className="crew-member-receipt" aria-live="polite">
          <b>{member.name}</b>
          <span>
            {volume(member.value)} · {(member.share * 100).toFixed(1)}% of
            recorded crew activity
            {!sessions ? ` · ${member.sessions} sessions` : ""}
          </span>
        </p>
      ) : null}
      {target ? (
        <p className="fb-note">
          {model.remaining
            ? `${volume(model.remaining)} ${sessions || distanceTarget ? "to the target" : "to match last week"}`
            : model.total > target
              ? `${volume(model.total - target)} beyond ${sessions || distanceTarget ? "the target" : "last week"}`
              : sessions || distanceTarget
                ? "Target reached together."
                : "Last week matched together."}
        </p>
      ) : null}
    </div>
  );
}
