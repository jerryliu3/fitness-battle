"use client";
import { CompetitionTimelineProvider, CompetitionTimelineControls } from "./competition-timeline-context";
import { CompetitionPanel } from "./competition-panel";
import { EventRegistration } from "./event-registration";
import { RaceUpdates } from "./race-updates";
import { CompeteIcon, EventHome, CrewEvents, ExploreEvents, CompeteResults } from "./event-home";
import { CompeteSheet } from "./compete-sheet";
import { StatusBadge, AppParagraph, AppText, AppHeading } from "@/ui/section";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { playCue } from "@/lib/haptics";

import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { AuthPrompt } from "@/components/auth-gate";
import { FieldStage } from "@/features/field/components/field-stage";
import { buildFieldModel } from "@/features/field/model";
import { buildSplitBoard } from "@/features/split/model";
import { loadCrewJoinOptions, seatCrewFieldPin } from "@/lib/crew-field";
import { WeekReveal } from "@/features/split/components/week-reveal";
import { SleepPanel } from "@/features/health/sleep-panel";
import { QueuedField } from "./queued-field";
import "./queued-field.css";
import { Sheet } from "@/ui/sheet";
import { APP_TIMEZONE, competitionQueue, competitionTrack, competeNow, competePeriodWindow, primaryFreezePeriodStart, sleepRenewal, SPORTS, weeklyCompetitionLastDay, weeklyPeriodBounds, eventRegistration, type CompeteEvent, type SportId } from "@fitness-battle/shared";

function formatCompetitionDateRange(startsAt: Date, endsAt: Date): string {
  const lastDay = weeklyCompetitionLastDay(endsAt);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  };
  return `${startsAt.toLocaleDateString("en-US", opts)} – ${lastDay.toLocaleDateString("en-US", opts)}`;
}

export function ArenaScreen({ tabActive = true, onExit }: { tabActive?: boolean; onExit?: () => void }) {
  const { state, dispatch, loadStatus, standingsStale, refresh } = useCompete();
  const { user } = useAuth();
  const router = useRouter();
  const requestedEvent=useSearchParams().get("event");
  const [immersiveAccount, setImmersiveAccount] = useState<string | null>(null);
  const [athleteFocus, setAthleteFocus] = useState<{ id: string; request: number } | null>(null);
  const [courseOptions, setCourseOptions] = useState<ReactNode>(null);
  const [expandRequest, setExpandRequest] = useState(0);
  const immersive = immersiveAccount === (user?.id ?? "guest") && tabActive;
  useEffect(() => { if (!tabActive) setImmersiveAccount(null); }, [tabActive]);
  const [authOpen, setAuthOpen] = useState(false);
  const [register, setRegister] = useState(false);
  const [selection, setSelection] = useState<{account:string; sport:SportId|"sleep"}|null>(null);
  useEffect(()=>{if(tabActive&&requestedEvent&&SPORTS.some(s=>s.id===requestedEvent))setSelection({account:user?.id??"guest",sport:requestedEvent as SportId});},[requestedEvent,user?.id,tabActive]);
  const [competeWithCrew, setCompeteWithCrew] = useState(false);
  const [sport, setSport] = useState<SportId | "sleep" | null>(null);
  const account = user?.id ?? "guest";
  const [joinBusy, setJoinBusy] = useState(false), [joinError, setJoinError] = useState("");
  const joinFlight = useRef<object | null>(null), currentAccount = useRef(account);
  currentAccount.current = account;
  useEffect(() => { setRegister(false); setSport(null); setJoinError(""); setJoinBusy(false); joinFlight.current = null; }, [account]);

  const [, updateClock] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => updateClock(value => value + 1), 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!state || state.demoNow) return;
    const starts = [...state.enrollments.map(e => Date.parse(e.waveStart)), ...state.healthRatings.filter(r => r.optedIn).map(r => Date.parse(r.lockPeriod))].filter(at => at > Date.now());
    if (!starts.length) return;
    const timer = setTimeout(() => { updateClock(value => value + 1); void refresh(); }, Math.min(...starts) - Date.now() + 50);
    return () => clearTimeout(timer);
  }, [state, refresh]);
  if (!state) return <AppParagraph typographyRole="body" className="fb-copy">Loading your lanes…</AppParagraph>;

  const now = competeNow(state);
  const frozen = state.frozenPeriods.includes(primaryFreezePeriodStart(state));
  const active = state.ratings.filter((r) => r.optedIn);
  const sleepRating = state.healthRatings.find((item) => item.metric === "sleep");
  const sleepOptedIn = Boolean(sleepRating?.optedIn);

  const requested = selection?.account === account ? selection.sport : null;
  const selectedSport = requested && (requested === "sleep" ? sleepOptedIn : active.some(r=>r.sport===requested))
    ? requested : active.find(r=>r.sport===state.primary)?.sport ?? active[0]?.sport ?? (sleepOptedIn ? "sleep" : null);
  const track = competitionTrack(selectedSport && selectedSport !== "sleep" ? selectedSport : state.primary);
  const headerSport = selectedSport === "sleep" ? undefined : selectedSport;
  const period = headerSport
    ? competePeriodWindow(state, now, headerSport)
    : weeklyPeriodBounds(now);
  if (selectedSport === "sleep" && sleepRating?.optedIn) period.startsAt = new Date(sleepRating.lockPeriod);
  const queue = selectedSport ? competitionQueue(state, selectedSport, now) : null;
  if (selectedSport === "sleep" && queue) period.endsAt = new Date(queue.end);
  const msLeft = Math.max(0, period.endsAt.getTime() - now.getTime());
  const daysLeft = Math.floor(msLeft / (24 * 3600 * 1000));
  const hoursLeft = Math.ceil(msLeft / (3600 * 1000));
  const badgeLabel = msLeft === 0 ? "Ended" : daysLeft >= 1 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : `${hoursLeft} hour${hoursLeft === 1 ? "" : "s"} left`;
  const dateRangeLabel = formatCompetitionDateRange(period.startsAt, period.endsAt);

  function openRegistration(event: CompeteEvent | null = null) {
    if (joinBusy) return;
    joinFlight.current = null;
    setSport(event); setJoinError(""); setCompeteWithCrew(false); setRegister(true);
  }
  async function claimEntry() {
    if (!sport || joinFlight.current || (sport === "sleep" ? sleepOptedIn : active.some(r => r.sport === sport))) return;
    if (!user) { setRegister(false); setAuthOpen(true); return; }
    if (!state!.onboardingCompleted) { setRegister(false); router.push("/onboarding"); return; }
    const joiningAccount = account, event = sport;
    const flight = {};
    joinFlight.current = flight; setJoinBusy(true); setJoinError("");
    let committed = false;
    try {
      let pin = null;
      if (event !== "sleep" && competeWithCrew) {
        const options = await loadCrewJoinOptions();
        const crew = options.find(item => item.sport === event);
        if (!crew) throw new Error("Join a crew for this sport in Crew before claiming a crew entry pass.");
        pin = await seatCrewFieldPin({ crewId: crew.id, sport: event });
        if (!pin) throw new Error("Could not prepare your crew entry. Please try again.");
      }
      if (currentAccount.current !== joiningAccount || joinFlight.current !== flight) return;
      if (event === "sleep") dispatch({ type: "opt-in-health", metric: "sleep", accountId: joiningAccount });
      else {
        dispatch({ type: "set-primary", sport: event, accountId: joiningAccount });
        dispatch({ type: "opt-in", sport: event, crewBoard: pin, accountId: joiningAccount });
      }
      committed = true;
      setSelection({ account: joiningAccount, sport: event });
      setRegister(false);
      void playCue("success");
    } catch (error) {
      if (currentAccount.current === joiningAccount && joinFlight.current === flight) setJoinError(error instanceof Error ? error.message : "Could not claim your entry pass.");
    } finally {
      if (currentAccount.current === joiningAccount && joinFlight.current === flight) { if (!committed) joinFlight.current = null; setJoinBusy(false); }
    }
  }

  const sleep = sleepRenewal(state);

  return (
    <CompetitionTimelineProvider state={state} selection={{ sport: selectedSport && selectedSport !== "sleep" ? selectedSport : state.primary, track, periodStart: period.startsAt.toISOString(), periodEnd: period.endsAt.toISOString() }} active={immersive && !queue?.queued && !queue?.awaitingField}>
    <div className="focus-arena">
      {selectedSport && selectedSport !== "sleep" && !queue?.queued && !queue?.awaitingField ? <FieldStage externalAthleteFocus={athleteFocus} key={`${account}:${selectedSport}:${state.units}`} onOptionsChange={setCourseOptions} persistent backgroundMode presentationVisible={immersive} onExit={() => setImmersiveAccount(null)} tabActive={tabActive} replayState={state} queueOverlay={queue && (queue.queued || queue.awaitingField) ? <QueuedField overlay state={state} event={selectedSport} now={now} onCancel={() => dispatch({ type: "opt-out", sport: selectedSport })} /> : undefined} sportTitle={SPORTS.find(s => s.id === selectedSport)?.name} model={buildFieldModel(state,selectedSport,track,now)} boardRows={buildSplitBoard(state,selectedSport,track,now).rows} /> : null}
      {immersive && <div className="compete-field-options">{courseOptions}</div>}
      {immersive && (queue?.queued || queue?.awaitingField) && <button type="button" className="club-icon-button compete-queued-back" aria-label="Back to events" onClick={() => setImmersiveAccount(null)}>←</button>}
      {!immersive && <div className="compete-event-home">
        <header className="compete-home-header">
          <div className="compete-section-heading"><div className="compete-home-title"><CompeteIcon name="wreath" size={34} /><AppHeading role="display" level={1}>Compete</AppHeading></div></div>
          <div className="compete-home-date"><AppText secondary>{dateRangeLabel}</AppText><StatusBadge>{badgeLabel}</StatusBadge></div>
        </header>
        {standingsStale && <AppParagraph typographyRole="caption" role="status" className="fb-note">Standings may be out of date until the next refresh.</AppParagraph>}
        <EventHome active={tabActive && !immersive} state={state} onEnter={event => { setSelection({ account, sport: event }); setImmersiveAccount(account); }} onRecovery={() => setSelection({ account, sport: "sleep" })} onRegister={() => openRegistration()} />
        <CrewEvents onChoose={() => router.push("/field")} />
        <ExploreEvents onChoose={event => {
          if (event === "sleep" && sleepOptedIn) setSelection({ account, sport: "sleep" });
          else if (event !== "sleep" && active.some(r => r.sport === event)) { setSelection({ account, sport: event }); setImmersiveAccount(account); }
          else openRegistration(event);
        }} />
        <CompeteResults state={state} />
      </div>}
      <CompeteSheet overview={!queue?.queued && !queue?.awaitingField ? <CompetitionTimelineControls /> : undefined} active={immersive} expandRequest={expandRequest}>



      {frozen && (
        <div className="fb-pill" style={{ marginBottom: "16px" }}>
          <b>❄ Week frozen</b>
          <span>Your effort score is protected through next Monday.</span>
        </div>
      )}

      {standingsStale ? (
        <AppParagraph typographyRole="caption" className="fb-note" role="status">
          Standings may be out of date. They'll refresh when the connection returns.
        </AppParagraph>
      ) : null}

      {selectedSport && selectedSport !== "sleep" ? queue?.queued || queue?.awaitingField ? <QueuedField state={state} event={selectedSport} now={now} onCancel={() => { dispatch({ type: "opt-out", sport: selectedSport }); setImmersiveAccount(null); }} /> : <CompetitionPanel key={`${account}:${selectedSport}:${period.startsAt.toISOString()}`} active={immersive} standings={<FieldStage onFocusAthlete={id => { setAthleteFocus(previous => ({ id, request: (previous?.request ?? 0) + 1 })); }} standingsOnly key={`${account}:${selectedSport}:${state.units}`} tabActive={immersive} replayState={state} sportTitle={SPORTS.find(s=>s.id===selectedSport)?.name} model={buildFieldModel(state,selectedSport,track,now)} boardRows={buildSplitBoard(state,selectedSport,track,now).rows} queueOverlay={queue && (queue.queued || queue.awaitingField) ? <QueuedField state={state} event={selectedSport} now={now} onCancel={() => dispatch({ type: "opt-out", sport: selectedSport })} /> : undefined} />} activity={visible => <RaceUpdates state={state} sport={selectedSport} active={visible} />} /> : null}
      </CompeteSheet>
      <div hidden={immersive}>
      {selectedSport === "sleep" && (queue && (queue.queued || queue.awaitingField) ? <QueuedField state={state} event="sleep" now={now} onCancel={() => dispatch({type:"opt-out-health",metric:"sleep"})} /> : <SleepPanel state={state} now={now} onJoin={() => openRegistration("sleep")} onLeave={()=>dispatch({type:sleep.renews?"schedule-leave":"resume-renewal",metric:"sleep"})} leaveLabel={sleep.renews?"Stop after this week":"Keep playing next week"} />)}

      <div className="club-competition-extras">
      <WeekReveal
        state={state}
        ready={loadStatus === "ready" || loadStatus === "local"}
        onDismiss={(revealIds) => dispatch({ type: "acknowledge-reveal", revealIds })}
      />


      </div>
      </div>
      <Sheet open={register} title={sport ? eventRegistration(state, sport, now).title : "Choose an event"} body={sport ? eventRegistration(state, sport, now).description : "Review the event details before claiming an entry pass."} onClose={() => { if (!joinBusy) setRegister(false); }} scrollResetKey={sport ?? "choose"}>
        {sport ? <>
          {sport !== "sleep" && <div className="compete-section-heading" style={{ marginBottom: 20 }}><AppText role="label">Compete with your crew</AppText><button type="button" role="switch" aria-label="Compete with your crew" aria-checked={competeWithCrew} disabled={joinBusy} className={competeWithCrew ? "fb-switch on" : "fb-switch"} onClick={() => setCompeteWithCrew(!competeWithCrew)}><span className="fb-switch-knob" /></button></div>}
          <EventRegistration key={`${account}:${sport}`} state={state} event={sport} registered={sport === "sleep" ? sleepOptedIn : active.some(r => r.sport === sport)} busy={joinBusy} error={joinError} onClaim={() => void claimEntry()} />
        </> : <div className="focus-sport-options" aria-label="Sport or category">
          {[...SPORTS.map(item => ({ id: item.id, name: item.name })), { id: "sleep" as const, name: "Sleep & recovery" }].map(item => {
            const registered = item.id === "sleep" ? sleepOptedIn : active.some(r => r.sport === item.id);
            return <button key={item.id} type="button" disabled={registered} className="focus-sport-option" onClick={() => setSport(item.id)}><AppText role="label">{item.name}</AppText><AppText role="caption" secondary>{registered ? "Already registered" : "View event details →"}</AppText></button>;
          })}
        </div>}
      </Sheet>

      <AuthPrompt
        open={authOpen}
        reason="Sign in to join your weekly field."
        onClose={() => setAuthOpen(false)}
      />
    </div>
    </CompetitionTimelineProvider>
  );
}
