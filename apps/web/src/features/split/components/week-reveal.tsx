"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { animate, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { APP_TIMEZONE, competeNow, pendingPeriodResults, sportById, type CompeteState, type PeriodResult } from "@fitness-battle/shared";

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
  const started = new Date(results[0]!.periodEnd);
  const date = started.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE, timeZoneName: "short" });
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
          <p>{started <= competeNow(state) ? "The next round started" : "The next round starts"} {date}.</p>
          <p className="fb-note">Sport settings control whether you renew after the current round.</p>
          <Link href="/you?panel=preferences" className="fb-btn-line" onClick={onDismiss}>Update sport settings</Link>
          <button type="button" className="fb-btn" onClick={onDismiss}>Back to Compete</button>
        </>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

export function WeekReveal({ state, ready, onDismiss }: { state: CompeteState; ready: boolean; onDismiss: (revealIds: string[]) => void }) {
  const path = usePathname();
  const pending = pendingPeriodResults(state.periodResults);
  if (!ready || path !== "/arena" || !pending.length) return null;
  const periodStart = pending[0]!.periodStart;
  const round = pending.filter((result) => result.periodStart === periodStart);
  const results = round.filter((result) => result.track === "open" || !round.some((other) => other.sport === result.sport && other.track === "open"));
  return <RoundTakeover key={periodStart} state={state} results={results} onDismiss={() => onDismiss(round.map((result) => result.id))}/>;
}
