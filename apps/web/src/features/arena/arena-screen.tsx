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
import { FieldJoinActions, FieldCrewSwitch } from "@/features/rally/field-join";
import { AwardShelf } from "@/features/you/award-shelf";
import { WeekReveal } from "@/features/split/components/week-reveal";
import { Sheet } from "@/ui/sheet";
import {
  competeNow,
  primaryFreezePeriodStart,
  SPORTS,
  type SportId,
  type ScoreTrack,
} from "@fitness-battle/shared";

export function ArenaScreen() {
  const { state, dispatch } = useCompete();
  const { user } = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [register, setRegister] = useState(false);
  const [sport, setSport] = useState<SportId>("running");
  const [track, setTrack] = useState<ScoreTrack>("open");
  if (!state) return <p className="fb-copy">Loading your lanes…</p>;
  const now = competeNow(state);
  const frozen = state.frozenPeriods.includes(primaryFreezePeriodStart(state));
  const active = state.ratings.filter((r) => r.optedIn);
  const board = buildSplitBoard(state, state.primary, track, now);
  const model = buildFieldModel(state, state.primary, track, now);
  function participate(_reason: string, action: () => void) {
    if (!user) {
      setRegister(false);
      setAuthOpen(true);
      return;
    }
    if (!state!.onboardingCompleted) {
      router.push("/onboarding");
      return;
    }
    action();
  }
  return (
    <div className="focus-arena">
      <header className="focus-heading">
        <p className="fb-kicker">Your week, your pace</p>
        <h1>A little further than before.</h1>
        <p className="fb-copy">Your effort. Your field. Your past self.</p>
      </header>
      {frozen && (
        <div className="fb-pill" style={{ marginBottom: "16px" }}>
          <b>❄ Week frozen</b>
          <span>Your Elo rating is protected through next Monday.</span>
        </div>
      )}
      <div className="focus-registration-tabs">
        {active.map((r) => (
          <button
            key={r.sport}
            aria-pressed={r.sport === state.primary}
            onClick={() => dispatch({ type: "set-primary", sport: r.sport })}
          >
            {SPORTS.find((s) => s.id === r.sport)?.name}
          </button>
        ))}
        <button
          onClick={() => {
            setSport(state.primary);
            setRegister(true);
          }}
        >
          ＋ Register
        </button>
      </div>
      {board.optedIn ? (
        <>
          <div className="focus-row">
            <h2>{SPORTS.find((s) => s.id === state.primary)?.name}</h2>
            <div className="focus-segments" role="group" aria-label="Score track">
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
            key={`${state.primary}-${track}`}
            model={model}
            boardRows={board.rows}
          />
          <details className="focus-disclosure">
            <summary>
              Compete with your crew <span>＋</span>
            </summary>
            <div className="focus-details-body">
              <FieldCrewSwitch sport={state.primary} />
            </div>
          </details>
        </>
      ) : (
        <section className="focus-card focus-empty">
          <span className="focus-empty-mark">◎</span>
          <h2>Your next chapter starts here.</h2>
          <p className="fb-copy">Pick a sport and join for the week.</p>
          <button className="fb-btn" onClick={() => setRegister(true)}>
            Find a field
          </button>
        </section>
      )}
      <section className="focus-card focus-coming-soon" aria-disabled="true">
        <p className="fb-kicker">Coming soon</p>
        <h2>1v1</h2>
        <p className="fb-copy">
          Challenge a friend head-to-head for the week. Not open yet — stay
          tuned.
        </p>
        <button type="button" className="fb-btn-line" disabled>
          1v1 · Coming soon
        </button>
      </section>
      <WeekReveal
        state={state}
        onDismiss={() => dispatch({ type: "acknowledge-reveal" })}
      />
      <details className="focus-disclosure">
        <summary>
          Past competitions & awards <span>＋</span>
        </summary>
        <div className="focus-details-body">
          <AwardShelf state={state} />
        </div>
      </details>
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
        title="Find your next field."
        body="Choose a sport and join, or register with a private crew. Each member opts in individually."
        onClose={() => setRegister(false)}
      >
        <p className="fb-kicker">Your sport</p>
        <div className="focus-sport-options" role="radiogroup" aria-label="Sport">
          {SPORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={sport === s.id}
              className={
                sport === s.id ? "focus-sport-option is-on" : "focus-sport-option"
              }
              onClick={() => setSport(s.id)}
            >
              <b>{s.name}</b>
              <small>
                {s.gps ? "GPS distance & open effort" : "Open effort score"}
              </small>
            </button>
          ))}
        </div>
        <FieldJoinActions
          sport={sport}
          sportName={SPORTS.find((s) => s.id === sport)?.name ?? sport}
          requireParticipate={participate}
          onJoined={() => setRegister(false)}
        />
      </Sheet>
      <AuthPrompt
        open={authOpen}
        reason="Sign in to join your weekly field."
        onClose={() => setAuthOpen(false)}
      />
    </div>
  );
}
