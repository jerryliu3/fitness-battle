"use client";

import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { AuthPrompt } from "@/components/auth-gate";
import { FieldStage } from "@/features/field/components/field-stage";
import { buildFieldModel } from "@/features/field/model";
import { buildSplitBoard } from "@/features/split/model";
import { buildArenaModel, competeNow, type CompeteState } from "@fitness-battle/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ArenaScreen() {
  const { state, dispatch } = useCompete();
  const { user } = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  if (!state) return <p className="fb-copy">Loading the track…</p>;

  const now = competeNow(state);
  const arena = buildArenaModel(state, now);

  function join() {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (!state!.onboardingCompleted) {
      router.push("/onboarding");
      return;
    }
    dispatch({ type: "opt-in", sport: state!.primary });
  }

  return (
    <>
      <p className="fb-kicker">Arena</p>
      {arena.optedIn ? (
        <ArenaTrack state={state} now={now} />
      ) : (
        <section className="sp-empty">
          <h2>You are not on a track yet</h2>
          <p className="fb-copy">Join this week to see the 2D lanes and 3D pursuit.</p>
          <button type="button" className="fb-btn" onClick={join}>
            Join {arena.sportName}
          </button>
        </section>
      )}
      <AuthPrompt
        open={authOpen}
        reason="Sign in to join the weekly track."
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}

function ArenaTrack({ state, now }: { state: CompeteState; now: Date }) {
  const board = buildSplitBoard(state, state.primary, "open", now);
  const field = buildFieldModel(state, state.primary, "open", now);
  return <FieldStage model={field} boardRows={board.rows} />;
}
