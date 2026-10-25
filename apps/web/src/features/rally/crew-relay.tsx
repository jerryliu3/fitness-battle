"use client";
import { UserAvatar } from "@/ui/user-avatar";
import { typographyStyle, AppText, AppParagraph  } from "@/ui/section";

import { useId, useLayoutEffect, useRef, useState } from "react";
import {
  crewWeekRelay,
  crewRelayScene,
  formatVolume,
  type CrewWeekRelayInput,
  type SportId,
  type UnitSystem,
} from "@fitness-battle/shared";
import { drawFieldNode } from "@/features/field/components/field-course";
type Props = CrewWeekRelayInput & { units?: UnitSystem; userId?: string };
export function CrewRelay(props: Props) {
  const { members, sport, units, userId } = props;
  const [selected, setSelected] = useState(""),
    [width, setWidth] = useState(320),
    host = useRef<HTMLDivElement>(null),
    prefix = useId();
  const { model, sessions, kind, target, label } = crewWeekRelay(props);
  const w = Math.max(width, members.length * 64 + 32),
    scene = crewRelayScene(model, w, prefix);
  const member =
    model.segments.find((m) => m.id === (selected || userId)) ??
    model.segments[0];
  const volume = (value: number) =>
    sessions
      ? `${value} sessions`
      : formatVolume(sport as SportId, value, 0, units);
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
    <div ref={host} className="crew-dimensional-relay">
      <div className="crew-relay-context">
        <span>{label}</span>
        {target ? <b>{volume(target)}</b> : null}
      </div>
      <div className="club-crew-track-scroll">
        <div
          className="club-crew-track"
          style={{ width: w, height: scene.height }}
        >
          <svg
            width={w}
            height={scene.height}
            viewBox={`0 0 ${w} ${scene.height}`}
            role="img"
            aria-label={`${volume(model.total)} together${target ? ` of ${volume(target)} target` : "; target unavailable"}`}
          >
            {scene.ground.map(drawFieldNode)}
            {scene.segments.map((s) => (
              <g key={s.id}>{s.nodes.map(drawFieldNode)}</g>
            ))}
            {scene.finish.map(drawFieldNode)}
            {target ? (
              <text style={typographyStyle("caption")}
                x={Math.max(64, Math.min(w - 64, (scene.finishX ?? 0) + 12))}
                y={222}
                textAnchor="middle"
                fill="#142b3b"

              >
                FINISH · {volume(target)}
              </text>
            ) : (
              <text style={typographyStyle("caption")}
                x={w / 2}
                y={222}
                textAnchor="middle"
                fill="#637482"

              >
                A shared target has not been set
              </text>
            )}
          </svg>
          {scene.people.map((p) => {
            const m = model.segments.find((m) => m.id === p.id)!,
              person = members.find((m) => m.user_id === p.id);
            return (
              <button
                type="button"
                className="club-crew-marker"
                key={p.id}
                style={{ left: p.x - 28, top: p.y }}
                aria-pressed={member?.id === p.id}
                aria-label={`${m.name}, ${volume(m.value)}`}
                onClick={() => setSelected(p.id)}
              >
                <span
                  className="crew-member-photo"
                  style={{
                    border: `3px solid ${member?.id === p.id ? "#142b3b" : p.color}`,
                  }}
                >
                  <UserAvatar src={person?.avatar_url} name={m.name} size={34} />
                </span>
                <b>{m.name.split(" ")[0]}</b>
                <AppText as="small" role="caption" secondary>{volume(m.value)}</AppText>
              </button>
            );
          })}
        </div>
      </div>
      {member ? (
        <AppParagraph typographyRole="body" className="crew-member-receipt" aria-live="polite">
          <b>{member.name}</b>
          <span>
            {volume(member.value)} · {(member.share * 100).toFixed(1)}% of
            recorded crew activity · {member.sessions} {member.sessions===1?"session":"sessions"}
          </span>
        </AppParagraph>
      ) : null}
      {target ? (
        <AppParagraph typographyRole="caption" className="fb-note">
          {model.remaining
            ? `${volume(model.remaining)} ${kind === "baseline" ? "to match last week" : "to the target"}`
            : model.total > target
              ? `${volume(model.total - target)} beyond ${kind === "baseline" ? "last week" : "the target"}`
              : "Target reached together."}
        </AppParagraph>
      ) : (
        <AppParagraph typographyRole="caption" className="fb-note">
          Recorded contributions are shown without inventing a finish.
        </AppParagraph>
      )}
    </div>
  );
}
