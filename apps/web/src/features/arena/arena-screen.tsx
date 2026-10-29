"use client";
import { FeatureCard, StatusBadge, AppParagraph, AppText, typographyStyle, SectionHeader, AppHeading } from "@/ui/section";

import { EventCarousel } from "@/features/club/event-carousel";
import { useEffect, useState } from "react";

import { playCue } from "@/lib/haptics";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { APP_TIMEZONE, competitionQueue, sportRenewal, waveTimeLabel, nextDailyWaveWindowAt, competitionTrack, competitionTrackLabel, competeNow, competePeriodWindow, primaryFreezePeriodStart, sleepRenewal, SPORTS, weeklyCompetitionLastDay, weeklyPeriodBounds, type SportId } from "@fitness-battle/shared";

function formatCompetitionDateRange(startsAt: Date, endsAt: Date): string {
  const lastDay = weeklyCompetitionLastDay(endsAt);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  };
  return `${startsAt.toLocaleDateString("en-US", opts)} – ${lastDay.toLocaleDateString("en-US", opts)}`;
}

export function ArenaScreen({ tabActive = true }: { tabActive?: boolean }) {
  const { state, dispatch, loadStatus, standingsStale, refresh } = useCompete();
  const { user } = useAuth();
  const router = useRouter();
  const requestedEvent=useSearchParams().get("event");
  const [authOpen, setAuthOpen] = useState(false);
  const [register, setRegister] = useState(false);
  const [selection, setSelection] = useState<{account:string; sport:SportId|"sleep"}|null>(null);
  useEffect(()=>{if(tabActive&&requestedEvent&&SPORTS.some(s=>s.id===requestedEvent))setSelection({account:user?.id??"guest",sport:requestedEvent as SportId});},[requestedEvent,user?.id,tabActive]);
  const [competeWithCrew, setCompeteWithCrew] = useState(false);
  const [sport, setSport] = useState<SportId | "sleep" | null>(null);
  const account = user?.id ?? "guest";

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
  const renewal = selectedSport && selectedSport !== "sleep" ? sportRenewal(state, selectedSport) : null;
  const msLeft = Math.max(0, period.endsAt.getTime() - now.getTime());
  const daysLeft = Math.floor(msLeft / (24 * 3600 * 1000));
  const hoursLeft = Math.floor((msLeft % (24 * 3600 * 1000)) / (3600 * 1000));
  const minutesLeft = Math.floor((msLeft % (3600 * 1000)) / (60 * 1000));
  const badgeLabel =
    daysLeft >= 1
      ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
      : hoursLeft >= 1
        ? `${hoursLeft} hour${hoursLeft === 1 ? "" : "s"} left`
        : `${Math.max(1, minutesLeft)}m left`;
  const dateRangeLabel = formatCompetitionDateRange(period.startsAt, period.endsAt);

  function participate(_reason: string, action: () => void) {
    if (!user) {
      setRegister(false);
      setSport(null);
      setAuthOpen(true);
      return;
    }
    if (!state!.onboardingCompleted) {
      setRegister(false);
      setSport(null);
      router.push("/onboarding");
      return;
    }
    action();
  }

  const hasAnyRegistration = active.length > 0 || sleepOptedIn;

  const sleep = sleepRenewal(state);

  return (
    <div className="focus-arena">
      <header className="focus-competition-card">
        <div className="focus-competition-info">
          <SectionHeader
            titleRole="display"
            title={
              <span style={{ display: "inline-flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span>Competition</span>
                <StatusBadge>{queue?.queued ? "Queued" : badgeLabel}</StatusBadge>
              </span>
            }
            subtitle={dateRangeLabel}
            action={
              <div className="ui-competition-status" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  aria-label="Register for new sports"
                  onClick={() => {
                    setSport(null);
                    setRegister(true);
                  }}
                  style={{
                    cursor: "pointer",
                    padding: "6px 14px",
                    borderRadius: "999px",
                    border: "1px solid var(--line, #e0e5dc)",
                    background: "var(--card, #ffffff)",
                    color: "var(--ink, #00101b)",
                    ...typographyStyle("label"),
                  }}
                >
                  ＋ Register
                </button>
              </div>
            }
          />

        </div>
      </header>

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

      {hasAnyRegistration ? <EventCarousel key={account} events={[...active.map(r=>({id:r.sport,label:SPORTS.find(s=>s.id===r.sport)!.name,badge:competitionTrackLabel(r.sport)})),...(sleepOptedIn?[{id:"sleep",label:"Sleep & Recovery"}]:[])]} value={selectedSport!} onChange={id=>{setSelection({account,sport:id as SportId|"sleep"});void playCue("selection");}} onRegister={()=>{setSport(null);setRegister(true);}}>
      {selectedSport === "sleep" && queue && (queue.queued || queue.awaitingField) ? <QueuedField state={state} event={selectedSport} now={now} onCancel={() => dispatch(selectedSport === "sleep" ? { type: "opt-out-health", metric: "sleep" } : { type: "opt-out", sport: selectedSport })} /> : selectedSport && selectedSport !== "sleep" ? (
        <FieldStage key={`${account}:${selectedSport}:${state.units}`} tabActive={tabActive}
          replayState={state}
          queueOverlay={queue && (queue.queued || queue.awaitingField) ? <QueuedField overlay state={state} event={selectedSport} now={now} onCancel={() => dispatch({ type: "opt-out", sport: selectedSport })} /> : undefined}
          sportTitle={SPORTS.find(s=>s.id===selectedSport)?.name}
          model={buildFieldModel(state,selectedSport,track,now)}
          boardRows={buildSplitBoard(state,selectedSport,track,now).rows}/>
      ) : selectedSport === "sleep" ? (
        <SleepPanel state={state} now={now}
          onJoin={()=>participate("join sleep",()=>dispatch({type:"opt-in-health",metric:"sleep"}))}
          onLeave={()=>dispatch({type:sleep.renews?"schedule-leave":"resume-renewal",metric:"sleep"})}
          leaveLabel={sleep.renews?"Stop after this week":"Keep playing next week"}/>
      ) : <section className="focus-card focus-empty"><AppHeading level={2} role="heading">Your next chapter starts here.</AppHeading><AppParagraph typographyRole="body" className="fb-copy">Register for an event to open your field.</AppParagraph></section>}

      {selectedSport && selectedSport !== "sleep" && !queue?.queued && !queue?.awaitingField && Boolean(state.enrollments.find(e => e.sport === selectedSport)?.syntheticIds.length) ? <AppParagraph typographyRole="caption" className="fb-note">This field includes {state.enrollments.find(e => e.sport === selectedSport)!.syntheticIds.length} generated competitors.</AppParagraph> : null}
      {selectedSport && !queue?.queued && !queue?.awaitingField ? <AppParagraph typographyRole="caption" className="fb-note">Sync workouts before the end time. Late uploads won't change final results.</AppParagraph> : null}
      {selectedSport && renewal && !queue?.queued && !queue?.awaitingField ? <button type="button" className="fb-btn-line" onClick={() => dispatch({ type: renewal.renews ? "schedule-leave" : "resume-renewal", sport: selectedSport as SportId })}>{renewal.renews ? "Stop after this week" : "Keep playing next week"}</button> : null}
      </EventCarousel> : <section className="focus-card focus-empty"><AppHeading level={2} role="heading">Your next chapter starts here.</AppHeading><AppParagraph typographyRole="body" className="fb-copy">Register for an event to open your field.</AppParagraph><button type="button" className="fb-btn" onClick={()=>setRegister(true)}>Explore events</button></section>}

      {state.periodResults.length ? (
        <Link className="fb-btn-ghost" href="/arena?results=latest">
          Last week results ↗
        </Link>
      ) : null}
      <div className="club-competition-extras">
      <WeekReveal
        state={state}
        ready={loadStatus === "ready" || loadStatus === "local"}
        onDismiss={(revealIds) => dispatch({ type: "acknowledge-reveal", revealIds })}
      />

      <FeatureCard title="Beyond this week" description="All-time pace and race rankings." href="/pace"/>

      </div>
      <Sheet
        open={register}
        title="Register for this week."
        body="Select an event or recovery category to join for the week."
        onClose={() => {
          setRegister(false);
          setSport(null);
        }}
      >
        <AppParagraph typographyRole="body" className="fb-copy">Next wave starts {waveTimeLabel(nextDailyWaveWindowAt(now).waveStart)}. Everyone starts at zero.</AppParagraph>
        <div
          className="fb-row"
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0",
            marginBottom: 12,
            borderBottom: "1px solid var(--line, #e0e5dc)",
          }}
        >
          <div>
            <strong style={{ ...typographyStyle("label"), display: "block" }}>
              Compete with your crew
            </strong>
            <AppText as="small" role="body" secondary style={{ ...typographyStyle("caption"), color: "var(--muted)" }}>
              Share an individual field leaderboard with your crew
            </AppText>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={competeWithCrew}
            className={competeWithCrew ? "fb-switch on" : "fb-switch"}
            onClick={() => setCompeteWithCrew(!competeWithCrew)}
          >
            <span className="fb-switch-knob" />
          </button>
        </div>

        <AppParagraph typographyRole="label" className="fb-kicker">Event / Category</AppParagraph>
        <div className="focus-sport-options" aria-label="Sport or Category">
          {SPORTS.map((s) => {
            const isRegistered = state.ratings.find(
              (r) => r.sport === s.id,
            )?.optedIn;
            return (
              <button
                key={s.id}
                type="button"
                disabled={Boolean(isRegistered) || sport !== null}
                aria-label={
                  isRegistered
                    ? `${s.name}, already registered this week`
                    : `Join ${s.name}`
                }
                className={
                  sport === s.id
                    ? "focus-sport-option is-on"
                    : "focus-sport-option"
                }
                onClick={() => {
                  if (isRegistered || sport !== null) return;
                  void playCue("selection");
                  setSport(s.id);
                  participate(`Sign in to join ${s.name} this week.`, async () => {
                    try {
                      let pin = null;
                      if (competeWithCrew) {
                        try {
                          const options = await loadCrewJoinOptions();
                          const matchingCrew = options.find((c) => c.sport === s.id);
                          if (matchingCrew) {
                            pin = await seatCrewFieldPin({
                              crewId: matchingCrew.id,
                              sport: s.id,
                            });
                          }
                        } catch {
                          // fallback to density field if crew seating fails
                        }
                      }
                      setSelection({account,sport:s.id});
                      dispatch({ type: "set-primary", sport: s.id });
                      dispatch({ type: "opt-in", sport: s.id, crewBoard: pin });
                    } finally {
                      void playCue("success");
                      setRegister(false);
                      setSport(null);
                    }
                  });
                }}
              >
                <b>{sport === s.id ? "Joining…" : s.name} <span className="club-track-badge">{competitionTrackLabel(s.id)}</span></b>
                <AppText as="small" role="caption" secondary>
                  {isRegistered
                    ? "Already registered"
                    : competitionTrackLabel(s.id)}
                </AppText>
              </button>
            );
          })}
          <button
            type="button"
            disabled={sleepOptedIn || sport !== null}
            aria-label={
              sleepOptedIn
                ? "Sleep and Recovery, already registered this week"
                : "Join Sleep and Recovery"
            }
            className={
              sport === "sleep"
                ? "focus-sport-option is-on"
                : "focus-sport-option"
            }
            onClick={() => {
              if (sleepOptedIn || sport !== null) return;
              setSport("sleep");
              participate("join sleep", () => {
                try {
                  setSelection({account,sport:"sleep"});
                  dispatch({ type: "opt-in-health", metric: "sleep" });
                } finally {
                  setRegister(false);
                  setSport(null);
                }
              });
            }}
          >
            <b>{sport === "sleep" ? "Joining…" : "Sleep & Recovery"}</b>
            <AppText as="small" role="caption" secondary>
              {sleepOptedIn
                ? "Already registered"
                : "Weekly recovery & sleep duration score"}
            </AppText>
          </button>
        </div>
      </Sheet>

      <AuthPrompt
        open={authOpen}
        reason="Sign in to join your weekly field."
        onClose={() => setAuthOpen(false)}
      />
    </div>
  );
}
