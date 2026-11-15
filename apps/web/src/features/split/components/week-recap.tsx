"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { AppParagraph, typographyStyle } from "@/ui/section";
import type { ChartDatum } from "@/ui/chart-scrubber";
import { SportActivityIcon } from "@/ui/sport-activity-icon";
import { StandardLineChart } from "@/ui/standard-line-chart";
import { UserAvatar } from "@/ui/user-avatar";
import { Ember } from "@/components/mascot/ember";
import { CompetitionReplayButton } from "@/features/replay/competition-replay";
import {
  APP_ICON_PATHS, LAUREL_WREATH_PATHS, WEEK_RECAP_COLORS, formatEffort, formatPeriodDateRange,
  sportById, weekRecapBreakdown, weekRecapCopy, weekRecapPages, weekRecapPodium, weekRecapTraining,
  type CompeteState, type CompetitionReplay, type PeriodResult,
} from "@fitness-battle/shared";
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

const STEP_CLASS = { 1: "is-first", 2: "is-second", 3: "is-third" } as const;

function RecapIcon({ name, size = 16 }: { name: keyof typeof APP_ICON_PATHS; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d={APP_ICON_PATHS[name]} />
    </svg>
  );
}

export function WeekRecap({ state, results, social, onDismiss, loadReplay, hiddenIds = [] }: {
  state: CompeteState; results: PeriodResult[]; social: boolean; onDismiss: () => void;
  loadReplay?: (result: PeriodResult) => Promise<CompetitionReplay | null>; hiddenIds?: readonly string[];
}) {
  const pages = weekRecapPages(results);
  const [index, setIndex] = useState(0);
  const [replays, setReplays] = useState<Record<string, CompetitionReplay | null>>({});
  const { current, page, last, title, description, label } = weekRecapCopy(pages, index);
  const reduced = useReducedMotion();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [current]);

  const currentResult = page.kind === "arrival" ? null : page.result;
  useEffect(() => {
    if (!loadReplay || !currentResult || currentResult.id in replays) return;
    let cancelled = false;
    void loadReplay(currentResult)
      .then((data) => { if (!cancelled) setReplays((prev) => ({ ...prev, [currentResult.id]: data })); })
      .catch(() => { if (!cancelled) setReplays((prev) => ({ ...prev, [currentResult.id]: null })); });
    return () => { cancelled = true; };
  }, [loadReplay, currentResult?.id]);

  return (
    <Dialog.Root open><Dialog.Portal>
      <Dialog.Overlay className="focus-round-overlay" />
      <Dialog.Content className="focus-round-takeover week-recap-afterglow" style={atmosphere} aria-describedby="round-description"
        onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => { e.preventDefault(); heading.current?.focus({ preventScroll: true }); }}>
        <div className="week-recap-progress" role="progressbar" aria-label="Week recap progress"
          aria-valuemin={0} aria-valuemax={pages.length} aria-valuenow={current + 1} aria-valuetext={`Step ${current + 1} of ${pages.length}`}>
          {pages.map((_, step) => <span key={step} className={step <= current ? "is-complete" : undefined} />)}
        </div>
        <motion.div className="week-recap-content" key={current} initial={reduced ? false : { x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }} transition={{ duration: reduced ? 0 : 0.2 }}>
          <header className="week-recap-heading">
            {page.kind !== "arrival" && (
              <div className="week-recap-eyebrow-row">
                <div className="week-recap-eyebrow-left">
                  {current > 0 && (
                    <button type="button" className="week-recap-back-btn" aria-label="Back" onClick={() => setIndex(current - 1)}>
                      <RecapIcon name="back" size={16} />
                    </button>
                  )}
                  <SportActivityIcon sport={page.result.sport} size={18} />
                  <span className="week-recap-sport-name">{sportById(page.result.sport).name}</span>
                  <span className="week-recap-track-badge">{page.result.track === "verified" ? "GPS" : "Open"}</span>
                </div>
                <span className="week-recap-date-range">{formatPeriodDateRange(page.result.periodStart, page.result.periodEnd)}</span>
              </div>
            )}
            <Dialog.Title ref={heading} tabIndex={-1}>{title}</Dialog.Title>
            <Dialog.Description id="round-description">{description}</Dialog.Description>
          </header>

          <WeekRecapFit>
            {page.kind === "arrival" ? (
              <div className="week-recap-arrival">
                <Ember style={{ width: 180, height: 180 }} />
                <AppParagraph>Your effort added up. Let’s see where it took you.</AppParagraph>
              </div>
            ) : page.kind === "results" ? (
              <div className="week-recap-results-wrap">
                <PodiumHero replay={replays[page.result.id] ?? null} state={state} result={page.result} hiddenIds={hiddenIds} />
                <ResultCard key={page.result.id} result={page.result} units={state.units} variant="recap" />
              </div>
            ) : <Training state={state} result={page.result} />}
          </WeekRecapFit>

          <footer className="week-recap-footer">
            <button type="button" className="fb-btn" onClick={() => (last ? onDismiss() : setIndex(current + 1))}>{label}</button>
            {page.kind === "results" && (
              <div className="week-recap-link-row">
                <CompetitionReplayButton state={state} selection={page.result} label="Replay this round" variant="link" />
                {social && (
                  <Dialog.Root>
                    <Dialog.Trigger asChild><button type="button" className="week-recap-link-btn">Field choices</button></Dialog.Trigger>
                    <Dialog.Portal>
                      <Dialog.Overlay className="week-recap-choices-overlay" />
                      <Dialog.Content className="week-recap-choices" aria-describedby={undefined}>
                        <Dialog.Title style={typographyStyle("heading")}>Field choices</Dialog.Title>
                        <AppParagraph>Choices appear when eligible athletes are available.</AppParagraph>
                        <WeeklySocialActions result={page.result} units={state.units} />
                        <Dialog.Close className="fb-btn-line">Back to recap</Dialog.Close>
                      </Dialog.Content>
                    </Dialog.Portal>
                  </Dialog.Root>
                )}
              </div>
            )}
            {last && page.kind === "effort" && (
              <div className="week-recap-link-row">
                <Link href="/app/athlete?panel=preferences" className="week-recap-link-btn" onClick={onDismiss}>Update sport settings</Link>
              </div>
            )}
          </footer>
        </motion.div>
      </Dialog.Content>
    </Dialog.Portal></Dialog.Root>
  );
}

function PodiumHero({ replay, state, result, hiddenIds }: {
  replay: CompetitionReplay | null; state: CompeteState; result: PeriodResult; hiddenIds: readonly string[];
}) {
  const slots = useMemo(() => weekRecapPodium(replay, state, result, hiddenIds), [replay, state, result, hiddenIds]);
  return (
    <div className={`week-recap-podium${slots.length === 1 ? " is-single" : ""}`}>
      {slots.map(({ step, entry }) => {
        const isFirst = step === 1;
        const avatarSize = isFirst ? 54 : 44;
        const stepClass = STEP_CLASS[step];
        return (
          <div key={step} className="week-recap-podium-col">
            <div className="week-recap-podium-athlete">
              <div className={`week-recap-avatar-frame ${stepClass}`}>
                {isFirst && (
                  <svg className="week-recap-laurel" width="76" height="64" viewBox="0 0 84 70" aria-hidden="true">
                    {LAUREL_WREATH_PATHS.map((d) => <path key={d} d={d} fill="none" stroke="#f7c948" strokeWidth="2.4" strokeLinecap="round" />)}
                  </svg>
                )}
                {entry ? (
                  <span className={`week-recap-avatar-ring ${stepClass}${entry.you && !isFirst ? " is-you" : ""}`}>
                    <UserAvatar src={entry.avatarUrl} name={entry.name} size={avatarSize} decorative />
                  </span>
                ) : <span className="week-recap-empty-avatar" style={{ width: avatarSize, height: avatarSize }}>—</span>}
              </div>
              <strong className={`week-recap-podium-name${entry?.you ? " is-you" : ""}`}>{entry?.name ?? "—"}</strong>
              {entry && <span className="week-recap-podium-metric">{entry.metricLabel}</span>}
            </div>
            <div className={`week-recap-pedestal ${stepClass}`}>
              <span className={`week-recap-pedestal-badge ${stepClass}`}>{step}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Training({ state, result }: { state: CompeteState; result: PeriodResult }) {
  const series = weekRecapTraining(state, result);
  const { negative, scoreLine, stats, nextRound } = weekRecapBreakdown(state, result);
  const [chartMode, setChartMode] = useState<"time" | "effort">("time");
  const [scrubbed, setScrubbed] = useState<ChartDatum | undefined>(undefined);
  const activeMode = chartMode === "effort" && series.hasEffort ? "effort" : "time";

  return (
    <section className="week-recap-training">
      <div className={`week-recap-score-banner${negative ? " is-negative" : ""}`}>
        <div className="week-recap-score-left">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill={negative ? "#f09c98" : "#4ea77c"} />
            <path d="M8.5 12.2l2.3 2.3 4.8-5" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{scoreLine}</span>
        </div>
        {!negative && !result.frozen && (
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
            <path d="M6 12h6M8 7l5 2M8 17l5-2" fill="none" stroke="var(--recap-success)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </div>

      <div className="week-recap-glass week-recap-stat-strip">
        {stats.map((item, idx) => (
          <div key={item.label} className="week-recap-stat-group">
            {idx > 0 && <span className="week-recap-stat-divider" aria-hidden="true" />}
            <div className="week-recap-stat-cell">
              <span className={`week-recap-stat-icon is-${item.tone}`}><RecapIcon name={item.icon} size={16} /></span>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="week-recap-chart-card">
        <div className="week-recap-chart-header">
          <div className="week-recap-chart-title">
            <RecapIcon name="scoring" size={16} />
            <strong>{scrubbed ? `${scrubbed.label} · ${scrubbed.value}` : activeMode === "time" ? "Training time" : "Effort"}</strong>
          </div>
          {series.available && series.hasEffort && (
            <div className="week-recap-mode-toggle" role="tablist" aria-label="Chart metric">
              {(["time", "effort"] as const).map((mode) => (
                <button key={mode} type="button" role="tab" aria-selected={activeMode === mode}
                  className={`week-recap-mode-pill${activeMode === mode ? " is-selected" : ""}`}
                  onClick={() => { if (activeMode !== mode) { setScrubbed(undefined); setChartMode(mode); } }}>
                  {mode === "time" ? "Time" : "Effort"}
                </button>
              ))}
            </div>
          )}
        </div>
        {series.available ? (
          <StandardLineChart height={156} showArea onSelectionChange={setScrubbed}
            yAxisLabel={activeMode === "time" ? "Training (min)" : "Effort (pts)"} xAxisLabel="Date (ET)"
            values={activeMode === "time" ? series.values : series.effortValues} pointLabels={series.labels}
            xLabels={[series.labels[0]!, series.labels[Math.floor((series.labels.length - 1) / 2)]!, series.labels.at(-1)!]}
            formatAxisY={(v) => (activeMode === "time" ? `${Math.round(v)}` : `${Number(v.toFixed(1))}`)}
            formatY={(v) => (activeMode === "time" ? `${Math.round(v)} min` : `${formatEffort(v)} pts`)}
            ariaLabel={activeMode === "time" ? "Cumulative training minutes in the settled week" : "Cumulative effort points in the settled week"} />
        ) : <AppParagraph>Detailed activity history is unavailable for this archived week.</AppParagraph>}
      </div>

      <div className="week-recap-glass week-recap-next-card">
        <div className="week-recap-next-header">
          <span className="week-recap-next-title"><RecapIcon name="calendar" size={16} /><strong>Next round</strong></span>
          <span className={`week-recap-next-pill${nextRound.active ? " is-active" : ""}`}>{nextRound.pill}</span>
        </div>
        <p className="week-recap-next-detail">{nextRound.detail}</p>
        <p className="week-recap-next-subtext">{nextRound.subtext}</p>
      </div>
    </section>
  );
}
