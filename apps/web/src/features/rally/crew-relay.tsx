"use client";
import { UserAvatar } from "@/ui/user-avatar";
import { typographyStyle, AppText, AppParagraph } from "@/ui/section";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  buildCrewRelayViewState,
  crewWeekRelay,
  type CrewWeekRelayInput,
  type SportId,
  type UnitSystem,
} from "@fitness-battle/shared";
import { drawFieldNode as drawFieldNodeDom } from "@/features/field/components/field-course";

type Props = CrewWeekRelayInput & { units?: UnitSystem; userId?: string };

export function CrewRelay(props: Props) {
  const { members, sport, units, userId } = props;
  const [selected, setSelected] = useState("");
  const [width, setWidth] = useState(320);
  const host = useRef<HTMLDivElement>(null);
  const prefix = useId();
  const relay = crewWeekRelay(props);
  const view = buildCrewRelayViewState(relay, {
    selected,
    userId,
    containerWidth: width,
    scenePrefix: prefix,
    sport: sport as SportId,
    units,
  });

  useEffect(() => {
    if (
      selected &&
      !view.model.segments.some((segment) => segment.id === selected)
    ) {
      setSelected("");
    }
  }, [view.segmentKey, selected, view.model.segments]);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const volume = view.volume;

  return (
    <div ref={host} className="crew-dimensional-relay">
      <div className="crew-relay-context">
        <span>{view.label}</span>
        {view.target ? <b>{volume(view.target)}</b> : null}
      </div>
      <div className="club-crew-track-scroll">
        <div
          className="club-crew-track"
          style={{ width: view.width, height: view.scene.height }}
        >
          <svg
            width={view.width}
            height={view.scene.height}
            viewBox={`0 0 ${view.width} ${view.scene.height}`}
            role="img"
            aria-label={`${volume(view.model.total)} together${view.target ? ` of ${volume(view.target)} target` : "; target unavailable"}`}
          >
            {view.scene.ground.map(drawFieldNodeDom)}
            {view.scene.segments.map((s) => (
              <g key={s.id}>{s.nodes.map(drawFieldNodeDom)}</g>
            ))}
            {view.scene.finish.map(drawFieldNodeDom)}
            {view.target ? (
              <text
                style={typographyStyle("caption")}
                x={Math.max(
                  64,
                  Math.min(
                    view.width - 64,
                    (view.scene.finishX ?? 0) + 12,
                  ),
                )}
                y={222}
                textAnchor="middle"
                fill="#142b3b"
              >
                FINISH · {volume(view.target)}
              </text>
            ) : (
              <text
                style={typographyStyle("caption")}
                x={view.width / 2}
                y={222}
                textAnchor="middle"
                fill="#637482"
              >
                A shared target has not been set
              </text>
            )}
          </svg>
          {view.scene.people.map((p) => {
            const m = view.model.segments.find((segment) => segment.id === p.id)!;
            const person = members.find((member) => member.user_id === p.id);
            return (
              <button
                type="button"
                className="club-crew-marker"
                key={p.id}
                style={{ left: p.x - 28, top: p.y }}
                aria-pressed={view.member?.id === p.id}
                aria-label={`${m.name}, ${volume(m.value)}`}
                onClick={() => setSelected(p.id)}
              >
                <span
                  className="crew-member-photo"
                  style={{
                    border: `3px solid ${view.member?.id === p.id ? "#142b3b" : p.color}`,
                  }}
                >
                  <UserAvatar src={person?.avatar_url} name={m.name} size={34} />
                </span>
                <b>{m.name.split(" ")[0]}</b>
                <AppText as="small" role="caption" secondary>
                  {volume(m.value)}
                </AppText>
              </button>
            );
          })}
        </div>
      </div>
      {view.empty ? (
        <AppParagraph typographyRole="caption" className="fb-note">
          No one has logged activity this week yet.
        </AppParagraph>
      ) : view.member ? (
        <AppParagraph
          typographyRole="body"
          className="crew-member-receipt"
          aria-live="polite"
        >
          <b>{view.member.name}</b>
          <span>
            {volume(view.member.value)} · {(view.member.share * 100).toFixed(1)}%
            of recorded crew activity · {view.member.sessions}{" "}
            {view.member.sessions === 1 ? "session" : "sessions"}
          </span>
        </AppParagraph>
      ) : null}
      {view.rosterFootnote ? (
        <AppParagraph typographyRole="caption" className="fb-note">
          {view.rosterFootnote}
        </AppParagraph>
      ) : null}
      {view.target ? (
        <AppParagraph typographyRole="caption" className="fb-note">
          {view.model.remaining
            ? `${volume(view.model.remaining)} ${view.kind === "baseline" ? "to match last week" : "to the target"}`
            : view.model.total > view.target
              ? `${volume(view.model.total - view.target)} beyond ${view.kind === "baseline" ? "last week" : "the target"}`
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
