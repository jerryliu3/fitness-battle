"use client";
import { EventCarousel } from "@/features/club/event-carousel";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { playCue } from "@/lib/haptics";
import { useScoreTrackLens } from "@/lib/score-track-lens";
import { useRouter } from "next/navigation";
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
import { Sheet } from "@/ui/sheet";
import {
  APP_TIMEZONE,
  competeNow,
  competePeriodWindow,
  primaryFreezePeriodStart,
  sleepRenewal,
  SPORTS,
  weeklyCompetitionLastDay,
  weeklyPeriodBounds,
  type SportId,
  type ScoreTrack,
} from "@fitness-battle/shared";

const SCORE_TRACK_TOOLTIP =
  "Open score counts all logged effort. GPS verified counts only activities with GPS proof from a connected tracker.";

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
  const { state, dispatch, loadStatus, standingsStale } = useCompete();
  const { user } = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [register, setRegister] = useState(false);
  const [selection, setSelection] = useState<{account:string; sport:SportId|"sleep"}|null>(null);
  const [competeWithCrew, setCompeteWithCrew] = useState(false);
  const [sport, setSport] = useState<SportId | "sleep" | null>(null);
  const [track, setTrack] = useScoreTrackLens();
  const [competitionTipOpen, setCompetitionTipOpen] = useState(false);

  useEffect(() => {
    if (!competitionTipOpen) return;
    const close = (event: MouseEvent) => {
      if (!(event.target as Element).closest(".focus-competition-tip-wrap")) {
        setCompetitionTipOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [competitionTipOpen]);

  function chooseTrack(next: ScoreTrack) {
    if (next === track) return;
    setTrack(next);
    void playCue("selection");
  }

  if (!state) return <p className="fb-copy">Loading your lanes…</p>;

  const now = competeNow(state);
  const frozen = state.frozenPeriods.includes(primaryFreezePeriodStart(state));
  const active = state.ratings.filter((r) => r.optedIn);
  const sleepRating = state.healthRatings.find((item) => item.metric === "sleep");
  const sleepOptedIn = Boolean(sleepRating?.optedIn);

  const account = user?.id ?? "guest";
  const requested = selection?.account === account ? selection.sport : null;
  const selectedSport = requested && (requested === "sleep" ? sleepOptedIn : active.some(r=>r.sport===requested))
    ? requested : active.find(r=>r.sport===state.primary)?.sport ?? active[0]?.sport ?? (sleepOptedIn ? "sleep" : null);
  const headerSport = selectedSport === "sleep" ? undefined : selectedSport;
  const period = headerSport
    ? competePeriodWindow(state, now, headerSport)
    : weeklyPeriodBounds(now);
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
          <p className="fb-kicker focus-competition-kicker">
            Competition
            <span className="focus-competition-tip-wrap">
              <button
                type="button"
                className="focus-competition-tip"
                aria-label="About competition scoring"
                aria-expanded={competitionTipOpen}
                onClick={() => setCompetitionTipOpen((open) => !open)}
              >
                ⓘ
              </button>
              {competitionTipOpen ? (
                <span className="focus-competition-tip-popover" role="tooltip">
                  {SCORE_TRACK_TOOLTIP}
                </span>
              ) : null}
            </span>
          </p>
          <p className="focus-competition-dates">
            {dateRangeLabel}
            <span className="focus-competition-pill">{badgeLabel}</span>
          </p>
        </div>
        {hasAnyRegistration ? (
          <div
            className="focus-segments focus-competition-tracks"
            role="group"
            aria-label="Score track"
          >
            <button
              type="button"
              className="focus-score-track-button"
              aria-pressed={track === "open"}
              onClick={() => chooseTrack("open")}
            >
              {track === "open" ? <motion.span layoutId="score-track-indicator" className="focus-score-track-indicator" /> : null}
              Open score
            </button>
            <button
              type="button"
              className="focus-score-track-button"
              aria-pressed={track === "verified"}
              onClick={() => chooseTrack("verified")}
            >
              {track === "verified" ? <motion.span layoutId="score-track-indicator" className="focus-score-track-indicator" /> : null}
              GPS verified
            </button>
          </div>
        ) : null}
      </header>

      {frozen && (
        <div className="fb-pill" style={{ marginBottom: "16px" }}>
          <b>❄ Week frozen</b>
          <span>Your effort score is protected through next Monday.</span>
        </div>
      )}

      {standingsStale ? (
        <p className="fb-note" role="status">
          Standings may be out of date. They'll refresh when the connection returns.
        </p>
      ) : null}

      {hasAnyRegistration ? <EventCarousel key={account} events={[...active.map(r=>({id:r.sport,label:SPORTS.find(s=>s.id===r.sport)!.name})),...(sleepOptedIn?[{id:"sleep",label:"Sleep & Recovery"}]:[])]} value={selectedSport!} onChange={id=>{setSelection({account,sport:id as SportId|"sleep"});void playCue("selection");}} onRegister={()=>{setSport(null);setRegister(true);}}>
      {selectedSport && selectedSport !== "sleep" ? (
        <FieldStage key={`${account}:${selectedSport}:${state.units}`} tabActive={tabActive}
          sportTitle={SPORTS.find(s=>s.id===selectedSport)?.name}
          model={buildFieldModel(state,selectedSport,track,now)}
          boardRows={buildSplitBoard(state,selectedSport,track,now).rows}/>
      ) : selectedSport === "sleep" ? (
        <SleepPanel state={state} now={now}
          onJoin={()=>participate("join sleep",()=>dispatch({type:"opt-in-health",metric:"sleep"}))}
          onSample={()=>dispatch({type:"log-sleep"})}
          onLeave={()=>dispatch({type:sleep.renews?"schedule-leave":"resume-renewal",metric:"sleep"})}
          leaveLabel={sleep.renews?"Stop after this week":"Keep playing next week"}/>
      ) : <section className="focus-card focus-empty"><h2>Your next chapter starts here.</h2><p className="fb-copy">Register for an event to open your field.</p></section>}

      </EventCarousel> : <section className="focus-card focus-empty"><h2>Your next chapter starts here.</h2><p className="fb-copy">Register for an event to open your field.</p><button type="button" className="fb-btn" onClick={()=>setRegister(true)}>Explore events</button></section>}

      {state.periodResults.length ? (
        <Link className="fb-btn-ghost" href="/arena?results=latest">
          Latest week results ↗
        </Link>
      ) : null}
      <section className="focus-card focus-coming-soon">
        <p className="fb-kicker">Coming soon</p>
        <h2>1v1 Head-to-Head</h2>
        <p className="fb-copy">
          Challenge a friend or rival stranger head-to-head for the week. Not open
          yet — stay tuned.
        </p>
      </section>

      <WeekReveal
        state={state}
        ready={loadStatus === "ready" || loadStatus === "local"}
        onDismiss={(revealIds) => dispatch({ type: "acknowledge-reveal", revealIds })}
      />

      <Link href="/pace" className="focus-benchmark">
        <span aria-hidden="true">→</span>
        <div>
          <b>Beyond this week</b>
          <small>All-time pace & race rankings</small>
        </div>
        <span aria-hidden="true">→</span>
      </Link>

      <Sheet
        open={register}
        title="Register for this week."
        body="Select an event or recovery category to join for the week."
        onClose={() => {
          setRegister(false);
          setSport(null);
        }}
      >
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
            <strong style={{ display: "block", fontSize: 14 }}>
              Compete with your crew
            </strong>
            <small style={{ color: "var(--muted)", fontSize: 12 }}>
              Share an individual field leaderboard with your crew
            </small>
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

        <p className="fb-kicker">Event / Category</p>
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
                <b>{sport === s.id ? "Joining…" : s.name}</b>
                <small>
                  {isRegistered
                    ? "Already registered"
                    : s.gps
                      ? "GPS distance & open effort"
                      : "Open effort score"}
                </small>
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
            <small>
              {sleepOptedIn
                ? "Already registered"
                : "Weekly recovery & sleep duration score"}
            </small>
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
