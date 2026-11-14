"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { APP_ICON_PATHS, crewMemberRelayColor, crewOverview, crewReplayEvents, readCrewReplay, weeklyPeriodBounds, type CrewActivityPage, type CrewOverviewInput } from "@fitness-battle/shared";
import { AppHeading, AppText } from "@/ui/section";
import { UserAvatar } from "@/ui/user-avatar";
import { CrewRelay } from "./crew-relay";
import { CrewPassportPanel } from "./crew-passport";
import { CrewDerbyCard } from "./crew-derby";
import "./crew-overview.css";
import { useAuth } from "@/components/auth-context";

type Props = CrewOverviewInput & { crewId: string; onSelectMember: (id: string) => void; onViewMembers: () => void; children?: ReactNode };
export function CrewOverview({ crewId, onSelectMember, onViewMembers, children, ...input }: Props) {
  const { user, offlineMode } = useAuth();
  const [replayEntries, setReplayEntries] = useState<CrewOverviewInput["entries"]>();
  const [replayError, setReplayError] = useState("");
  useEffect(() => {
    setReplayEntries(undefined);
    setReplayError("");
    if (offlineMode) { setReplayEntries(input.entries); return; }
    if (!user) return;
    const controller = new AbortController();
    const since = weeklyPeriodBounds(new Date(input.now)).startsAt.toISOString();
    void readCrewReplay(async cursor => {
      const params = new URLSearchParams({ crewId, since, limit: "100" });
      if (cursor) { params.set("before", cursor.before); params.set("beforeId", cursor.beforeId); }
      const response = await fetch(`/api/crews/activities?${params}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
      if (!response.ok) throw Error();
      return response.json() as Promise<CrewActivityPage>;
    }, input.sport).then(rows => { if (!controller.signal.aborted) setReplayEntries(rows); }).catch(() => { if (!controller.signal.aborted) setReplayError("Replay unavailable"); });
    return () => controller.abort();
  }, [crewId, user?.id, offlineMode, input.sport, input.now]);
  const full = crewOverview(input);
  const events = useMemo(() => crewReplayEvents(input, offlineMode ? input.entries : replayEntries ?? []), [replayEntries, input.entries, input.members, input.now, offlineMode]);
  const [frame, setFrame] = useState(1);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const view = crewOverview(input, frame, events);
  useEffect(() => {
    if (!playing || !events.length) return;
    if (reduced) { setFrame(1); setPlaying(false); return; }
    let animation = 0, lastPaint = 0;
    const from = frameRef.current, started = Date.now();
    const duration = Math.min(12000, Math.max(1800, events.length * 700));
    const tick = () => {
      if (document.hidden) { setPlaying(false); return; }
      const elapsed = Date.now() - started;
      const next = Math.min(1, from + elapsed / duration);
      if (elapsed - lastPaint >= 32 || next === 1) { setFrame(next); lastPaint = elapsed; }
      if (next < 1) animation = requestAnimationFrame(tick); else setPlaying(false);
    };
    animation = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation);
  }, [playing, reduced, events.length]);
  return <div className="crew-overview">
    <section className="crew-week-hero" aria-label="Shared weekly progress">
      <AppText role="label">This week · {input.sport}</AppText>
      <div className="crew-week-value">
        <AppText role="hero">{view.reading}</AppText><AppText role="body">{view.targetReading != null ? `/ ${view.targetReading} ` : ""}{view.unit}</AppText></div>
      {input.previousDistanceM != null && !view.relay.sessions && <AppText role="caption" className="crew-ghost">Crew Ghost · {view.volume(input.previousDistanceM)} last week</AppText>}
      <CrewRelay {...input} entries={view.entries} model={view.relay.model} compact onSelectMember={onSelectMember} />
      <div className="crew-replay">
        <button type="button" className="crew-play" disabled={!events.length} aria-label={playing ? "Pause replay" : "Replay this week"} aria-pressed={playing} onClick={() => { if (!playing && frame === 1) setFrame(0); setPlaying(!playing); }}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d={APP_ICON_PATHS[playing ? "pause" : "play"]} /></svg></button>
        <input aria-label="Weekly replay timeline" type="range" disabled={!events.length} min={0} max={1} step={0.001} value={frame} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} />
        <AppText role="caption">{view.replayLabel}</AppText>
      </div>
      {replayError && <AppText role="caption" secondary>{replayError}</AppText>}
    </section>
    <section className="crew-lineup">
      <div className="crew-lineup-header"><AppHeading level={2} role="heading">Crew mates</AppHeading>{input.members.length > 4 && <button type="button" className="fb-btn-ghost" onClick={onViewMembers}>View all</button>}</div>
      <div className="crew-lineup-grid">{full.lineup.map(m => <button type="button" key={m.user_id} onClick={() => onSelectMember(m.user_id)}>
        <span style={{ borderColor: crewMemberRelayColor(m.user_id, input.members.map(member => member.user_id), view.relay.model) }}><UserAvatar src={m.avatar_url} name={m.display_name} size={42} /></span>
        <AppText role="label">{m.display_name.split(" ")[0]}</AppText>
        <AppText role="caption" secondary>{view.volume(view.relay.model.segments.find(s => s.id === m.user_id)?.value ?? 0)}</AppText>
      </button>)}</div>
    </section>
    <CrewPassportPanel crewId={crewId} input={input}>{children}</CrewPassportPanel>
    {full.highlights.length > 0 && <section>
      <AppHeading level={2} role="heading">Crew highlights</AppHeading>
      <ul className="crew-highlights">{full.highlights.map(h => <li key={h}><AppText role="body">{h}</AppText></li>)}</ul>
    </section>}

    <CrewDerbyCard crewId={crewId} units={input.units} />
  </div>;
}
