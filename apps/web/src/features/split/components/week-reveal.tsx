"use client";
import { StandardLineChart } from "@/ui/standard-line-chart";
import { ReplayViewer } from "@/features/replay/competition-replay";
import { useCompete } from "@/components/compete-context";
import { Ember } from "@/components/mascot/ember";
import { AppHeading, AppParagraph, typographyStyle } from "@/ui/section";

import { useAuth } from "@/components/auth-context";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { WeeklySocialActions } from "./weekly-social";
import { CompetitionReplayButton } from "@/features/replay/competition-replay";
import { ResultCard } from "./result-card";
import {
  countsOnTrack, APP_TIMEZONE,
  roundReveal,
  stripWebProductPrefix,
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
  const [stage, setStage] = useState<"arrival" | "results" | "effort">("arrival");
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
          <AppParagraph typographyRole="label" className="fb-kicker">
            Round complete · {["arrival", "results", "effort"].indexOf(stage) + 1} / 3
          </AppParagraph>
          <Dialog.Title>
            {stage === "arrival" ? "Small days. Quite a week." : stage === "results" ? "Your week, settled." : stage === "effort" ? "Your week in motion." : "New round. Fresh start."}
          </Dialog.Title>
          <Dialog.Description id="round-description">
            {stage === "results"
              ? "Here’s where your training took you."
              : "Your effort, your progress."}
          </Dialog.Description>
          {stage === "arrival" ? <><Ember style={{width:180,height:180,display:"block",margin:"16px auto"}}/><AppParagraph>Your effort added up. Let’s see where it took you.</AppParagraph><button className="fb-btn" onClick={()=>setStage("results")}>Reveal my finish →</button></> : stage === "effort" ? <RoundProgress state={state} results={results} onDismiss={onDismiss}/> : stage === "results" ? (
            <>
              {results.map((result) => (
                <div key={result.id}>
                  <div style={{position:"relative"}} className="week-board-preview"><ReplayViewer state={state} selection={result} initialDimension="4d" embedded/></div>
                  <ResultCard result={result} units={state.units} />
                  {social ? (
                    <WeeklySocialActions result={result} units={state.units} />
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                className="fb-btn"
                onClick={() => setStage("effort")}
              >
                See what added up →
              </button>
            </>
          ) : (
            <>
              {results.map((result) => {
                const enrollment = roundEnrollment(state, result);
                return (
                  <AppParagraph typographyRole="body" className="week-next-row" key={result.id}>
                    <b>{sportById(result.sport).name}</b>:{" "}
                    {enrollment.startsAt
                      ? `Your current round ${enrollment.status === "upcoming" ? "starts" : "started"} ${enrollment.startsAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE, timeZoneName: "short" })}. ${enrollment.renews ? "Renews after this round." : "Stops after this round."}`
                      : "You’re not registered for another round. Update sport settings to join again."}
                  </AppParagraph>
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
                Done
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
  const {debugActive,lastDebugEvent,resetDebugState}=useCompete();
  const [dismissed,setDismissed]=useState(false);
  const path = usePathname();
  const router = useRouter();
  const openingDebug=debugActive&&lastDebugEvent?.id==="week-closing";
  const replay = useSearchParams().get("results") === "latest" && !preview;
  useEffect(()=>{if(!replay)setDismissed(false);},[replay]);
  const reveal = roundReveal(
    (replay||openingDebug)
      ? {
          ...state,
          periodResults: state.periodResults.map((row) => ({
            ...row,
            acknowledgedAt: null,
          })),
        }
      : state,
  );
  if (dismissed || !ready || (!preview && (stripWebProductPrefix(path) !== "/arena" || !(replay||openingDebug))) || !reveal) return null;
  return (
    <RoundTakeover
      key={`${user?.id ?? "guest"}:${reveal.key}:${openingDebug?lastDebugEvent?.nonce:"saved"}`}
      state={state}
      social={!preview}
      results={reveal.results}
      onDismiss={() => {
        setDismissed(true); onDismiss(reveal.ids); if(debugActive)resetDebugState?.();
        if (replay) router.replace("/app/arena");
      }}
    />
  );
}

function RoundProgress({state,results,onDismiss}:{state:CompeteState;results:PeriodResult[];onDismiss:()=>void}){const reduced=useReducedMotion();return <>{results.map((r,i)=>{const activities=state.activities.filter(a=>a.sport===r.sport&&countsOnTrack(a,r.track)&&a.startedAt>=r.periodStart&&a.startedAt<r.periodEnd);const values=Array.from({length:7},(_,day)=>activities.filter(a=>Date.parse(a.startedAt)<Date.parse(r.periodStart)+(day+1)*86400000).reduce((sum,a)=>sum+a.movingSec/60,0));const enrollment=roundEnrollment(state,r);return <motion.section key={r.id} initial={{opacity:reduced?1:0,y:reduced?0:16}} animate={{opacity:1,y:0}} transition={{delay:reduced?0:i*.5}}><AppHeading>{sportById(r.sport).name}</AppHeading><AppParagraph>{Math.round(r.movingSec/60)} minutes · {r.effort.toFixed(1)} effort</AppParagraph><AppParagraph>Score {Math.round(r.eloBefore)} → {Math.round(r.eloAfter)} ({r.eloAfter>=r.eloBefore?"+":""}{Math.round(r.eloAfter-r.eloBefore)})</AppParagraph>{activities.length?<StandardLineChart yAxisLabel="Training (min)" xAxisLabel="Day" animateReveal values={values} xLabels={["Day 1","Day 4","Day 7"]} ariaLabel="Cumulative training minutes this week"/>:<AppParagraph>Detailed activity history is unavailable for this archived week.</AppParagraph>}<AppParagraph>{enrollment.startsAt?`Your current round ${enrollment.status==="upcoming"?"starts":"started"} ${enrollment.startsAt.toLocaleString("en-US",{timeZone:APP_TIMEZONE,timeZoneName:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}.`:"Update sport settings to join your next round."}</AppParagraph></motion.section>})}<Link href="/app/athlete?panel=preferences" className="fb-btn-line" onClick={onDismiss}>Update sport settings</Link><button className="fb-btn" onClick={onDismiss}>Done</button></>;}
