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
  const active = state.ratings.filter((r) => r.optedIn);
  const board = buildSplitBoard(state, state.primary, track, now);
  const model = buildFieldModel(state, state.primary, track, now);
  function participate(_reason: string, action: () => void) {
    if (!user) {
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
            <select
              aria-label="Score track"
              value={track}
              onChange={(e) => setTrack(e.target.value as ScoreTrack)}
            >
              <option value="open">Open score</option>
              <option value="verified">GPS verified</option>
            </select>
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
          <p className="fb-copy">
            Pick a sport. Join solo or register with your crew.
          </p>
          <button className="fb-btn" onClick={() => setRegister(true)}>
            Find an arena ↗
          </button>
        </section>
      )}
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
        <span>↗</span>
        <div>
          <b>Beyond this week</b>
          <small>All-time pace & race rankings</small>
        </div>
        <span>→</span>
      </Link>
      <Sheet
        open={register}
        title="Find your next arena."
        body="Choose a sport and join solo or with a private crew. Each member opts in individually."
        onClose={() => setRegister(false)}
      >
        <label className="fb-field">
          Your sport
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value as SportId)}
          >
            {SPORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
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
