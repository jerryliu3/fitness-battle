"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { crewOverview, readCrewReplay, weeklyPeriodBounds, type CrewActivityPage, type CrewOverviewInput } from "@fitness-battle/shared";
import { AppHeading, AppText, AppParagraph } from "@/ui/section";
import { UserAvatar } from "@/ui/user-avatar";
import { Sheet } from "@/ui/sheet";
import { CrewRelay } from "./crew-relay";
import "./crew-overview.css";
import { useAuth } from "@/components/auth-context";

type Props = CrewOverviewInput & { crewId: string; onSelectMember: (id: string) => void; children?: ReactNode };
export function CrewOverview({ crewId, onSelectMember, children, ...input }: Props) {
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
  }, [crewId, user?.id, offlineMode]);
  const full = crewOverview(input);
  const lastFrame = full.lastFrame;
  const [frame, setFrame] = useState(lastFrame);
  const [playing, setPlaying] = useState(false);
  const [detail, setDetail] = useState<"contract" | "passport" | "story" | null>(null);
  const reduced = useReducedMotion();
  const view = crewOverview({ ...input, replayEntries }, frame);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      if (document.hidden) { setPlaying(false); return; }
      setFrame(old => Math.min(lastFrame, old + 1));
    }, reduced ? 900 : 650);
    return () => window.clearInterval(timer);
  }, [playing, reduced, lastFrame]);
  useEffect(() => { if (frame === lastFrame) setPlaying(false); }, [frame, lastFrame]);
  return <div className="crew-overview">
    <section className="crew-week-hero" aria-label="Shared weekly progress">
      <AppText role="label">This week · {input.sport}</AppText>
      <div className="crew-week-value">
        <AppText role="hero">{view.reading}</AppText><AppText role="body">{view.targetReading != null ? `/ ${view.targetReading} ` : ""}{view.unit}</AppText></div>
      {input.previousDistanceM != null && !view.relay.sessions && <AppText role="caption" className="crew-ghost">Crew Ghost · {view.volume(input.previousDistanceM)} last week</AppText>}
      <CrewRelay {...input} entries={view.entries} compact onSelectMember={onSelectMember} />
      <div className="crew-replay">
        <button type="button" className="crew-play" disabled={!replayEntries} aria-label={playing ? "Pause replay" : "Replay this week"} aria-pressed={playing} onClick={() => { if (!playing && frame === lastFrame) setFrame(0); setPlaying(!playing); }}>{playing ? "Ⅱ" : "▶"}</button>
        <input aria-label="Weekly replay timeline" type="range" disabled={!replayEntries} min={0} max={lastFrame} step={1} value={frame} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} />
        <AppText role="caption">{frame === lastFrame ? "Now" : frame === 0 ? "Start" : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][frame - 1]}</AppText>
      </div>
      {replayError && <AppText role="caption" secondary>{replayError}</AppText>}
    </section>
    <section className="crew-lineup">
      <AppHeading level={2} role="heading">Teammate lineup</AppHeading>
      <div className="crew-lineup-grid">{input.members.map(m => <button type="button" key={m.user_id} onClick={() => onSelectMember(m.user_id)}>
          <span style={{ borderColor: full.relay.model.segments.find(s => s.id === m.user_id)?.color }}>
            <UserAvatar src={m.avatar_url} name={m.display_name} size={42} />
          </span>
          <AppText role="label">{m.display_name.split(" ")[0]}</AppText>
          <AppText role="caption" secondary>{full.volume(full.relay.model.segments.find(s => s.id === m.user_id)?.value ?? 0)}</AppText>
        </button>)}</div>
    </section>
    <button type="button" className="crew-contract" onClick={() => setDetail("contract")}>
      <AppText role="caption">Weekly contract ↗</AppText>
      <AppText role="heading">{full.relay.target ? `${full.volume(full.relay.target)} together` : "All hands on deck"}</AppText>
      <AppText role="caption">{full.contributors} / {input.members.length} contributed</AppText>
    </button>
    <div className="crew-bento">{children}<button type="button" className="crew-action-card crew-passport" onClick={() => setDetail("passport")}>
      <span>Crew Passport ↗</span><strong>Earned together.</strong><small>{full.highlights.length} weekly milestones</small>
    </button></div>
    {full.highlights.length > 0 && <section>
      <AppHeading level={2} role="heading">Crew highlights</AppHeading>
      <button type="button" className="crew-story" onClick={() => setDetail("story")}>{full.highlights.map(h => <span key={h}>✦ {h}</span>)}<span aria-hidden="true">↗</span>
      </button>
    </section>}
    <Sheet open={detail !== null} minimal title={detail === "contract" ? "Weekly contract" : detail === "passport" ? "Your crew passport" : "This week, together"} body="" onClose={() => setDetail(null)}>
      {detail === "contract" ? <AppParagraph typographyRole="body">{full.relay.target ? `${full.volume(full.relay.model.total)} / ${full.volume(full.relay.target)}` : `${full.contributors} / ${input.members.length} contributed`}</AppParagraph> : null}
      {!full.highlights.length && detail !== "contract" ? <AppParagraph typographyRole="body">This week’s shared milestones will appear here.</AppParagraph> : null}
      {full.highlights.map(h => <AppParagraph key={h} typographyRole="body">✦ {h}</AppParagraph>)}
    </Sheet>
  </div>;
}
