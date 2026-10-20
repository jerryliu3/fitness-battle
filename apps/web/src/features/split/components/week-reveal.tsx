"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { animate, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { APP_TIMEZONE, roundReveal, roundEnrollment, sportById, type CompeteState, type PeriodResult } from "@fitness-battle/shared";

function AnimatedNumber({ value, from = 0, decimals = 0 }: { value: number; from?: number; decimals?: number }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(from);
  useEffect(() => {
    if (reduced) { setDisplay(value); return; }
    const controls = animate(from, value, { duration: .9, ease: "easeOut", onUpdate: setDisplay });
    return () => controls.stop();
  }, [value, from, reduced]);
  return <span aria-label={value.toFixed(decimals)}>{display.toFixed(decimals)}</span>;
}

function RoundTakeover({ results, onDismiss, state }: { results: PeriodResult[]; onDismiss: () => void; state: CompeteState }) {
  const [stage, setStage] = useState<"results" | "next">("results");
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onDismiss(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="focus-round-overlay" />
      <Dialog.Content className="focus-round-takeover" aria-describedby="round-description" onPointerDownOutside={(event) => event.preventDefault()}>
        <button type="button" className="fb-btn-ghost" aria-label="Close round results" onClick={onDismiss}>×</button>
        <p className="fb-kicker">Round complete · {stage === "results" ? "1" : "2"} / 2</p>
        <Dialog.Title>{stage === "results" ? "Your week, settled." : "A fresh field awaits."}</Dialog.Title>
        <Dialog.Description id="round-description">{stage === "results" ? "Here’s where your training took you." : "Keep your sports active or update what you’re playing."}</Dialog.Description>
        {stage === "results" ? <>
          {results.map((result) => <section className="focus-round-result" key={result.id}>
            <h2>{sportById(result.sport).name}</h2>
            <p>Place <strong><AnimatedNumber value={result.place}/> / {result.fieldSize}</strong></p>
            <p>Effort <strong><AnimatedNumber value={result.effort} decimals={1}/></strong></p>
            <p>Effort score <strong className="focus-round-score"><AnimatedNumber from={result.eloBefore} value={result.eloAfter}/></strong> ({result.eloAfter - result.eloBefore >= 0 ? "+" : ""}{result.eloAfter - result.eloBefore})</p>
            {result.frozen && <p>Your score was protected by a freeze.</p>}
          </section>)}
          <button type="button" className="fb-btn" onClick={() => setStage("next")}>Next round →</button>
        </> : <>
          {results.map((result) => {
            const enrollment = roundEnrollment(state, result);
            return <p key={result.id}><b>{sportById(result.sport).name}</b>: {enrollment.startsAt
              ? `Your current round ${enrollment.status === "upcoming" ? "starts" : "started"} ${enrollment.startsAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE, timeZoneName: "short" })}. ${enrollment.renews ? "Renews after this round." : "Stops after this round."}`
              : "You’re not registered for another round. Update sport settings to join again."}</p>;
          })}
          <Link href="/you?panel=preferences" className="fb-btn-line" onClick={onDismiss}>Update sport settings</Link>
          <button type="button" className="fb-btn" onClick={onDismiss}>Back to Compete</button>
        </>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

export function WeekReveal({ state, ready, preview = false, onDismiss }: { state: CompeteState; ready: boolean; preview?: boolean; onDismiss: (revealIds: string[]) => void }) {
  const path = usePathname();
  const reveal = roundReveal(state);
  if (!ready || (!preview && path !== "/arena") || !reveal) return null;
  return <RoundTakeover key={reveal.key} state={state} results={reveal.results} onDismiss={() => onDismiss(reveal.ids)}/>;
}
