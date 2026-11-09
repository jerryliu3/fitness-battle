"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { AppParagraph, typographyStyle } from "@/ui/section";
import { StandardLineChart } from "@/ui/standard-line-chart";
import { Ember } from "@/components/mascot/ember";
import { CompetitionReplayButton } from "@/features/replay/competition-replay";
import { APP_TIMEZONE, WEEK_RECAP_COLORS, roundEnrollment, sportById, weekRecapPages, weekRecapTraining, type CompeteState, type PeriodResult } from "@fitness-battle/shared";
import { colors } from "@/theme/app-colors";
import { ResultCard } from "./result-card";
import { WeeklySocialActions } from "./weekly-social";
import { WeekRecapFit } from "./week-recap-fit";
import "./week-reveal.css";

const atmosphere = {
  "--recap-background": WEEK_RECAP_COLORS.background,
  "--recap-glow": WEEK_RECAP_COLORS.glow,
  "--recap-warm": WEEK_RECAP_COLORS.warm,
  "--recap-sage": WEEK_RECAP_COLORS.sage,
  "--recap-text": WEEK_RECAP_COLORS.text,
  "--recap-progress": WEEK_RECAP_COLORS.progress,
  "--recap-action": colors.actionPrimary,
  "--recap-action-pressed": colors.actionPressed,
  "--recap-ink": colors.textOnAction,
  "--recap-scrim": WEEK_RECAP_COLORS.scrim,
  "--recap-scrim-opacity": WEEK_RECAP_COLORS.scrimOpacity,
} as CSSProperties;

export function WeekRecap({ state, results, social, onDismiss }: {
  state: CompeteState; results: PeriodResult[]; social: boolean; onDismiss: () => void;
}) {
  const pages = weekRecapPages(results);
  const [index, setIndex] = useState(0);
  const current = Math.min(index, pages.length - 1);
  const page = pages[current]!;
  const next = pages[current + 1];
  const last = current === pages.length - 1;
  const reduced = useReducedMotion();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [current]);
  const title = page.kind === "arrival" ? "Small days. Quite a week." : sportById(page.result.sport).name;
  const description = page.kind === "arrival" ? "Your effort, your progress." : page.kind === "results" ? "Your week, settled." : "Your week in motion.";
  const label = last ? "Done" : page.kind === "arrival" ? "Reveal my finish →" : page.kind === "results" ? "See what added up →" : `${next?.kind !== "arrival" && next ? sportById(next.result.sport).name : "Next sport"} results →`;

  return <Dialog.Root open><Dialog.Portal>
    <Dialog.Overlay className="focus-round-overlay" />
    <Dialog.Content className="focus-round-takeover week-recap-afterglow" style={atmosphere} aria-describedby="round-description"
      onEscapeKeyDown={e => e.preventDefault()} onPointerDownOutside={e => e.preventDefault()}
      onOpenAutoFocus={e => { e.preventDefault(); heading.current?.focus({ preventScroll: true }); }}>
      <div className="week-recap-progress" role="progressbar" aria-label="Week recap progress" aria-valuemin={0} aria-valuemax={pages.length} aria-valuenow={current + 1} aria-valuetext={`Step ${current + 1} of ${pages.length}`}>
        {pages.map((_, step) => <span key={step} className={step <= current ? "is-complete" : undefined} />)}
      </div>
      <motion.div className="week-recap-content" key={current} initial={reduced ? false : { x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: reduced ? 0 : .2 }}>
        <header className="week-recap-heading"><Dialog.Title ref={heading} tabIndex={-1}>{title}</Dialog.Title><Dialog.Description id="round-description">{description}</Dialog.Description></header>
        <WeekRecapFit>
          {page.kind === "arrival" ? <div className="week-recap-arrival"><Ember style={{ width: 180, height: 180 }} /><AppParagraph>Your effort added up. Let’s see where it took you.</AppParagraph></div>
            : page.kind === "results" ? <ResultCard key={page.result.id} result={page.result} units={state.units} />
            : <Training state={state} result={page.result} />}
        </WeekRecapFit>
        <footer className="week-recap-footer">
          {page.kind === "results" && <div className="week-recap-detail-actions">
            <CompetitionReplayButton state={state} selection={page.result} label="Replay this round" />
            {social && <Dialog.Root><Dialog.Trigger asChild><button className="fb-btn-line">Field choices</button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="week-recap-choices-overlay" /><Dialog.Content className="week-recap-choices" aria-describedby={undefined}>
              <Dialog.Title style={typographyStyle("heading")}>Field choices</Dialog.Title><AppParagraph>Choices appear when eligible athletes are available.</AppParagraph><WeeklySocialActions result={page.result} units={state.units} /><Dialog.Close className="fb-btn-line">Back to recap</Dialog.Close>
            </Dialog.Content></Dialog.Portal></Dialog.Root>}
          </div>}
          {last && page.kind === "effort" && <Link href="/app/athlete?panel=preferences" className="fb-btn-line" onClick={onDismiss}>Update sport settings</Link>}
          <div className="week-recap-navigation">
            {current > 0 && <button className="fb-btn-line" onClick={() => setIndex(current - 1)}>Back</button>}
            <button className="fb-btn" onClick={() => last ? onDismiss() : setIndex(current + 1)}>{label}</button>
          </div>
        </footer>
      </motion.div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}

function Training({ state, result }: { state: CompeteState; result: PeriodResult }) {
  const series = weekRecapTraining(state, result);
  const enrollment = roundEnrollment(state, result);
  return <section className="week-recap-training">
    <AppParagraph>{Math.round(result.movingSec / 60)} minutes · {result.effort.toFixed(1)} effort</AppParagraph>
    <AppParagraph>Score {Math.round(result.eloBefore)} → {Math.round(result.eloAfter)} ({result.eloAfter >= result.eloBefore ? "+" : ""}{Math.round(result.eloAfter - result.eloBefore)})</AppParagraph>
    {series.available ? <StandardLineChart height={170} yAxisLabel="Training (min)" xAxisLabel="Date (ET)" values={series.values} pointLabels={series.labels}
      xLabels={[series.labels[0]!, series.labels[Math.floor((series.labels.length - 1) / 2)]!, series.labels.at(-1)!]} formatAxisY={v => `${Math.round(v)}`} formatY={v => `${Math.round(v)} min`} ariaLabel="Cumulative training minutes in the settled week" />
      : <AppParagraph>Detailed activity history is unavailable for this archived week.</AppParagraph>}
    <AppParagraph>{enrollment.startsAt
      ? `Your current round ${enrollment.status === "upcoming" ? "starts" : "started"} ${enrollment.startsAt.toLocaleString("en-US", { timeZone: APP_TIMEZONE, timeZoneName: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. ${enrollment.renews ? "Renews after this round." : "Stops after this round."}`
      : "You’re not registered for another round. Update sport settings to join again."}</AppParagraph>
  </section>;
}
