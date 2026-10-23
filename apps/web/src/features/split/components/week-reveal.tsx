"use client";

import { useAuth } from "@/components/auth-context";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { WeeklySocialActions } from "./weekly-social";
import { ResultCard } from "./result-card";
import {
  APP_TIMEZONE,
  roundReveal,
  roundEnrollment,
  sportById,
  type CompeteState,
  type PeriodResult,
} from "@fitness-battle/shared";

function RoundTakeover({
  results,
  onDismiss,
  state,
  social,
}: {
  results: PeriodResult[];
  onDismiss: () => void;
  state: CompeteState;
  social: boolean;
}) {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<"results" | "next">("results");
  return (
    <Dialog.Root
      open

    >
      <Dialog.Portal>
        <Dialog.Overlay className="focus-round-overlay" />
        <Dialog.Content
          className="focus-round-takeover"
          aria-describedby="round-description"
          onEscapeKeyDown={event => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <AnimatePresence mode="wait" initial={false}><motion.div key={stage} initial={reduced ? false : { x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: reduced ? 0 : -28, opacity: 0 }} transition={{ duration: reduced ? 0 : 0.2 }}>
          <p className="fb-kicker">
            Round complete · {stage === "results" ? "1" : "2"} / 2
          </p>
          <Dialog.Title>
            {stage === "results" ? "Your week, settled." : "Keep it going."}
          </Dialog.Title>
          <Dialog.Description id="round-description">
            {stage === "results"
              ? "Here’s where your training took you."
              : "Your next round."}
          </Dialog.Description>
          {stage === "results" ? (
            <>
              {results.map((result) => (
                <div key={result.id}>
                  <ResultCard result={result} units={state.units} />
                  {social ? (
                    <WeeklySocialActions result={result} units={state.units} />
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                className="fb-btn"
                onClick={() => setStage("next")}
              >
                Next round →
              </button>
            </>
          ) : (
            <>
              {results.map((result) => {
                const enrollment = roundEnrollment(state, result);
                return (
                  <p className="week-next-row" key={result.id}>
                    <b>{sportById(result.sport).name}</b>:{" "}
                    {enrollment.startsAt
                      ? `Your current round ${enrollment.status === "upcoming" ? "starts" : "started"} ${enrollment.startsAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE, timeZoneName: "short" })}. ${enrollment.renews ? "Renews after this round." : "Stops after this round."}`
                      : "You’re not registered for another round. Update sport settings to join again."}
                  </p>
                );
              })}
              <Link
                href="/athlete?panel=preferences"
                className="fb-btn-line"
                onClick={onDismiss}
              >
                Update sport settings
              </Link>
              <button type="button" className="fb-btn" onClick={onDismiss}>
                Back to Compete
              </button>
            </>
          )}
          </motion.div></AnimatePresence>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function WeekReveal({
  state,
  ready,
  preview = false,
  onDismiss,
}: {
  state: CompeteState;
  ready: boolean;
  preview?: boolean;
  onDismiss: (revealIds: string[]) => void;
}) {
  const { user } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const replay = useSearchParams().get("results") === "latest" && !preview;
  const reveal = roundReveal(
    replay
      ? {
          ...state,
          periodResults: state.periodResults.map((row) => ({
            ...row,
            acknowledgedAt: null,
          })),
        }
      : state,
  );
  if (!ready || (!preview && (path !== "/arena" || !replay)) || !reveal) return null;
  return (
    <RoundTakeover
      key={`${user?.id ?? "guest"}:${reveal.key}`}
      state={state}
      social={!preview}
      results={reveal.results}
      onDismiss={() => {
        onDismiss(reveal.ids);
        if (replay) router.replace("/arena");
      }}
    />
  );
}
