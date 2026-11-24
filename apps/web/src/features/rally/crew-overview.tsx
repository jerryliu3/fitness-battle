"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { APP_ICON_PATHS, CREW_INVITE_WEEKLY_PLACEHOLDER, crewMemberRelayColor, crewOverview, crewReplayEvents, readCrewReplay, weeklyPeriodBounds, type CrewActivityPage, type CrewOverviewInput } from "@fitness-battle/shared";
import { AppHeading, AppParagraph, AppText } from "@/ui/section";
import { UserAvatar } from "@/ui/user-avatar";
import { CrewRelay } from "./crew-relay";
import { useCrewContractModal } from "./crew-passport";
import { CrewBadgeCard } from "./crew-badge-card";
import { CrewDerbyCard } from "./crew-derby";
import "./crew-overview.css";
import { useAuth } from "@/components/auth-context";

type Props = CrewOverviewInput & {
  crewId: string;
  crewName: string;
  onSelectMember: (id: string) => void;
  onViewMembers: () => void;
  invitePreview?: boolean;
};
export function CrewOverview({ crewId, crewName, onSelectMember, onViewMembers, invitePreview = false, ...input }: Props) {
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
  const contractUi = useCrewContractModal(crewId, input);
  const { passport, contract } = contractUi;
  const overviewInput = useMemo<CrewOverviewInput>(
    () => ({ ...input, contract: contract ? { metric: contract.metric, target: contract.target } : null }),
    [input, contract?.metric, contract?.target],
  );
  const events = useMemo(() => crewReplayEvents(overviewInput, offlineMode ? overviewInput.entries : replayEntries ?? []), [replayEntries, overviewInput, offlineMode]);
  const full = crewOverview(overviewInput, 1, events);
  const [frame, setFrame] = useState(1);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const view = crewOverview(overviewInput, frame, events);
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
  return <><div className="crew-overview">
    <section
      className={invitePreview ? "crew-week-placeholder" : "crew-week-hero"}
      aria-label={invitePreview ? "Weekly field preview" : "Shared weekly progress"}
    >
      {invitePreview ? (
        <>
          <AppText role="label">Weekly field</AppText>
          <AppParagraph typographyRole="body" className="fb-copy">
            {CREW_INVITE_WEEKLY_PLACEHOLDER}
          </AppParagraph>
        </>
      ) : contract ? <>
        <div className="crew-week-hero-head">
          <div className="crew-week-hero-title">
            <AppText role="label">Weekly contract</AppText>
            <button type="button" className="crew-week-edit-btn" aria-label="Change weekly contract" onClick={contractUi.openSummary}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={APP_ICON_PATHS.edit} /></svg></button>
          </div>
          <AppText role="caption" secondary>{contract.contributors}/{contract.roster_size} active{view.complete ? " · Reached" : ""}</AppText>
        </div>
        <AppHeading level={2} role="heading">{contract.title}</AppHeading>
        <div className="crew-week-value">
          <AppText role="hero">{view.reading}</AppText><AppText role="body">{view.targetReading != null ? `/ ${view.targetReading} ` : ""}{view.unit}</AppText></div>

        <CrewRelay {...overviewInput} entries={view.entries} model={view.relay.model} compact onSelectMember={onSelectMember} />
        <div className="crew-replay">
          <button type="button" className="crew-play" disabled={!events.length} aria-label={playing ? "Pause replay" : "Replay this week"} aria-pressed={playing} onClick={() => { if (!playing && frame === 1) setFrame(0); setPlaying(!playing); }}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d={APP_ICON_PATHS[playing ? "pause" : "play"]} /></svg></button>
          <input aria-label="Weekly replay timeline" type="range" disabled={!events.length} min={0} max={1} step={0.001} value={frame} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} />
          <AppText role="caption">{view.replayLabel}</AppText>
        </div>
        {replayError && <AppText role="caption" secondary>{replayError}</AppText>}
      </> : <div className="crew-week-hero-empty">
        <AppText role="label">Weekly contract</AppText>
        <AppHeading level={2} role="heading">{!passport.available ? "Contracts unavailable" : !passport.data ? (passport.error ? "Could not load contract" : "Loading weekly contract…") : "Set this week’s contract"}</AppHeading>
        <AppParagraph typographyRole="caption">{!passport.available ? passport.unavailable : passport.data ? "Set one shared distance, time, or check-in goal for your crew this week." : (passport.error || "Checking your crew’s weekly objective.")}</AppParagraph>
        {passport.error && !passport.data ? <button type="button" className="fb-btn-line" onClick={() => void passport.reload()}>Refresh</button> : <button type="button" className="fb-btn" disabled={!passport.available || !passport.data} onClick={contractUi.openEditor}>Set weekly contract</button>}
      </div>}
    </section>
    <section className="crew-lineup">
      <div className="crew-lineup-header"><AppHeading level={2} role="heading">Crew mates</AppHeading>{input.members.length > 4 && <button type="button" className="fb-btn-ghost" onClick={onViewMembers}>View all</button>}</div>
      <div className="crew-lineup-grid">{full.lineup.map(m => <button type="button" key={m.user_id} onClick={() => onSelectMember(m.user_id)}>
        <span style={{ borderColor: crewMemberRelayColor(m.user_id, input.members.map(member => member.user_id), view.relay.model) }}><UserAvatar src={m.avatar_url} name={m.display_name} size={42} /></span>
        <AppText role="label">{m.display_name.split(" ")[0]}</AppText>
        <AppText role="caption" secondary>{view.volume(view.relay.model.segments.find(s => s.id === m.user_id)?.value ?? 0)}</AppText>
      </button>)}</div>
    </section>
    <CrewBadgeCard crewName={crewName} badges={passport.data?.badges} units={input.units} />

    <CrewDerbyCard crewId={crewId} sport={input.sport} units={input.units} />
  </div>{contractUi.sheet}</>;
}
