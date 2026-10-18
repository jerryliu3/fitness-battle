"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { AuthPrompt } from "@/components/auth-gate";
import { FieldStage } from "@/features/field/components/field-stage";
import { buildFieldModel } from "@/features/field/model";
import { buildSplitBoard } from "@/features/split/model";
import { FieldCrewSwitch } from "@/features/rally/field-join";
import { AwardShelf } from "@/features/you/award-shelf";
import { WeekReveal } from "@/features/split/components/week-reveal";
import { SleepPanel } from "@/features/health/sleep-panel";
import { Sheet } from "@/ui/sheet";
import {
  awardCards,
  competeNow,
  primaryFreezePeriodStart,
  sleepRenewal,
  SPORTS,
  weeklyPeriodBounds,
  type SportId,
  type ScoreTrack,
} from "@fitness-battle/shared";

export function ArenaScreen() {
  const { state, dispatch, fieldNotice, dismissFieldNotice, standingsStale } = useCompete();
  const { user } = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [register, setRegister] = useState(false);
  const [sport, setSport] = useState<SportId | "sleep" | null>(null);
  const [track, setTrack] = useState<ScoreTrack>("open");

  if (!state) return <p className="fb-copy">Loading your lanes…</p>;

  const now = competeNow(state);
  const frozen = state.frozenPeriods.includes(primaryFreezePeriodStart(state));
  const active = state.ratings.filter((r) => r.optedIn);
  const sleepRating = state.healthRatings.find((item) => item.metric === "sleep");
  const sleepOptedIn = Boolean(sleepRating?.optedIn);

  // Time left countdown badge & competition dates
  const period = weeklyPeriodBounds(now);
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
  const dateRangeLabel = `${period.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} – ${period.endsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;

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
          <p className="fb-kicker">Competition</p>
          <p className="focus-competition-dates">{dateRangeLabel}</p>
        </div>
        <span className="focus-competition-pill">
          ⏱ <b>{badgeLabel}</b>
        </span>
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
      {fieldNotice ? (
        <p className="fb-note" role="status">
          {fieldNotice.title}{" "}
          <button type="button" className="fb-btn-ghost" onClick={dismissFieldNotice}>
            Got it
          </button>
        </p>
      ) : null}

      {!hasAnyRegistration ? (
        <div style={{ margin: "16px 0 24px" }}>
          <button
            type="button"
            className="fb-btn"
            style={{ width: "100%", justifyContent: "center", padding: "12px 20px" }}
            onClick={() => {
              setSport(null);
              setRegister(true);
            }}
          >
            ＋ Register for an event
          </button>
          <section className="focus-card focus-empty" style={{ marginTop: 16 }}>
            <div className="focus-empty-sports-emojis" aria-hidden="true">
              🏃 🚴 🚶 🏋️
            </div>
            <h2>Your next chapter starts here.</h2>
            <p className="fb-copy">Pick an event and join for the week.</p>
          </section>
        </div>
      ) : (
        <div className="focus-registered-list">
          {active.map((r) => {
            const sportSpec = SPORTS.find((s) => s.id === r.sport);
            const sportBoard = buildSplitBoard(state, r.sport, track, now);
            const sportModel = buildFieldModel(state, r.sport, track, now);
            return (
              <section key={r.sport} style={{ marginBottom: 36 }}>
                <div className="focus-row" style={{ alignItems: "center" }}>
                  <h2>{sportSpec?.name ?? r.sport}</h2>
                  <div
                    className="focus-segments"
                    role="group"
                    aria-label="Score track"
                  >
                    <button
                      type="button"
                      aria-pressed={track === "open"}
                      onClick={() => setTrack("open")}
                    >
                      Open score
                    </button>
                    <button
                      type="button"
                      aria-pressed={track === "verified"}
                      onClick={() => setTrack("verified")}
                    >
                      GPS verified
                    </button>
                  </div>
                </div>
                <FieldStage
                  key={`${r.sport}-${track}`}
                  model={sportModel}
                  boardRows={sportBoard.rows}
                />
                <details className="focus-disclosure">
                  <summary>
                    Compete with your crew <span>＋</span>
                  </summary>
                  <div className="focus-details-body">
                    <FieldCrewSwitch sport={r.sport} />
                  </div>
                </details>
              </section>
            );
          })}

          {sleepOptedIn && (
            <section style={{ marginBottom: 36 }}>
              <SleepPanel
                state={state}
                now={now}
                onJoin={() => {
                  participate("join sleep", () => {
                    dispatch({ type: "opt-in-health", metric: "sleep" });
                  });
                }}
                onSample={() => dispatch({ type: "log-sleep" })}
                onLeave={() =>
                  dispatch({
                    type: sleep.renews ? "schedule-leave" : "resume-renewal",
                    metric: "sleep",
                  })
                }
                leaveLabel={
                  sleep.renews ? "Stop after this week" : "Keep playing next week"
                }
              />
            </section>
          )}

          {active.length < SPORTS.length && (
            <div style={{ margin: "20px 0 28px" }}>
              <button
                type="button"
                className="fb-btn-line"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  setSport(null);
                  setRegister(true);
                }}
              >
                ＋ Register for another event
              </button>
            </div>
          )}
        </div>
      )}

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
        onDismiss={(revealId) =>
          dispatch({ type: "acknowledge-reveal", revealIds: [revealId] })
        }
        onStop={(sport) => dispatch({ type: "schedule-leave", sport })}
        onKeep={(sport) => dispatch({ type: "resume-renewal", sport })}
        onJoin={(sport) => dispatch({ type: "opt-in", sport })}
      />

      {awardCards(state).length > 0 && (
        <details className="focus-disclosure">
          <summary>
            Past competitions & awards <span>＋</span>
          </summary>
          <div className="focus-details-body">
            <AwardShelf state={state} />
          </div>
        </details>
      )}

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
                disabled={Boolean(isRegistered)}
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
                  if (isRegistered) return;
                  setSport(s.id);
                  participate(`Sign in to join ${s.name} this week.`, () => {
                    dispatch({ type: "set-primary", sport: s.id });
                    dispatch({ type: "opt-in", sport: s.id, crewBoard: null });
                    setRegister(false);
                    setSport(null);
                  });
                }}
              >
                <b>{s.name}</b>
                <small>
                  {isRegistered
                    ? "Registered this week"
                    : s.gps
                      ? "GPS distance & open effort"
                      : "Open effort score"}
                </small>
              </button>
            );
          })}
          <button
            type="button"
            disabled={sleepOptedIn}
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
              if (sleepOptedIn) return;
              setSport("sleep");
              participate("join sleep", () => {
                dispatch({ type: "opt-in-health", metric: "sleep" });
                setRegister(false);
                setSport(null);
              });
            }}
          >
            <b>Sleep & Recovery</b>
            <small>
              {sleepOptedIn
                ? "Registered this week"
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
