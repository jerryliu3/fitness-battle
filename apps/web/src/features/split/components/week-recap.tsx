"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { AppParagraph, AppText, typographyStyle } from "@/ui/section";
import type { ChartDatum } from "@/ui/chart-scrubber";
import { SportActivityIcon } from "@/ui/sport-activity-icon";
import { StandardLineChart } from "@/ui/standard-line-chart";
import { UserAvatar } from "@/ui/user-avatar";
import { Ember } from "@/components/mascot/ember";
import { CompetitionReplayButton } from "@/features/replay/competition-replay";
import {
  APP_ICON_PATHS, WEEK_RECAP_COLORS, formatEffort, formatAccountPeriodDateRange,
  sportById, weekRecapBreakdown, weekRecapCopy, weekRecapHeartRateRanges, weekRecapHighlights,
  weekRecapPages, weekRecapPodium, weekRecapTraining,
  type CompeteState, type CompetitionReplay, type PeriodResult, type SportId, type WeekRecapTarget,
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
const STEP_DELAY = { 3: 0.05, 2: 0.22, 1: 0.40 } as const;
const PODIUM_STEP = {
  1: {
    topPoints: "8,0 112,0 120,14 0,14", lipY: 14,
    topA: "#fae082", topB: "#cb9128", lip: "#fff3ba",
    faceA: "#d3a134", faceAOpacity: 0.62, faceB: "#7a5416", faceBOpacity: 0.24,
  },
  2: {
    topPoints: "11,0 119,0 120,12 0,12", lipY: 12,
    topA: "#95a7b2", topB: "#556670", lip: "#d4e2ea",
    faceA: "#6e818c", faceAOpacity: 0.52, faceB: "#33444e", faceBOpacity: 0.2,
  },
  3: {
    topPoints: "1,0 109,0 120,12 0,12", lipY: 12,
    topA: "#be804c", topB: "#73421c", lip: "#eac09a",
    faceA: "#965828", faceAOpacity: 0.52, faceB: "#532e12", faceBOpacity: 0.18,
  },
} as const;

function RecapIcon({ name, size = 16 }: { name: keyof typeof APP_ICON_PATHS; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d={APP_ICON_PATHS[name]} />
    </svg>
  );
}

const RESUME_INDEX_KEY = "overtaek:recap_resume_index";

export function WeekRecap({ state, results, nonRaceWeek, social, onDismiss, loadReplay, hiddenIds = [] }: {
  state: CompeteState; results: PeriodResult[];
  nonRaceWeek?: { sport: SportId; periodStart: string; periodEnd: string } | null;
  social: boolean; onDismiss: () => void;
  loadReplay?: (result: PeriodResult) => Promise<CompetitionReplay | null>; hiddenIds?: readonly string[];
}) {
  const pages = weekRecapPages(results, nonRaceWeek);
  const [index, setIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    const saved = window.sessionStorage.getItem(RESUME_INDEX_KEY);
    if (saved == null) return 0;
    window.sessionStorage.removeItem(RESUME_INDEX_KEY);
    const parsed = Number.parseInt(saved, 10);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, pages.length - 1)) : 0;
  });
  const [replays, setReplays] = useState<Record<string, CompetitionReplay | null>>({});
  const { current, page, last, title, label } = weekRecapCopy(pages, index);
  const reduced = useReducedMotion();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [current]);

  const currentResult = page.kind === "results" || page.kind === "effort" ? page.result : undefined;
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
      <Dialog.Content className="focus-round-takeover week-recap-afterglow" style={atmosphere} aria-describedby={undefined}
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
                  <SportActivityIcon sport={page.kind === "results" ? page.result.sport : page.sport} size={18} />
                  <AppText role="label" className="week-recap-sport-name">{sportById(page.kind === "results" ? page.result.sport : page.sport).name}</AppText>
                  {page.kind === "results" && (
                    <AppText role="caption" className="week-recap-track-badge">{page.result.track === "verified" ? "GPS" : "Open"}</AppText>
                  )}
                </div>
                <AppText role="caption" className="week-recap-date-range">
                  {formatAccountPeriodDateRange(state, page.kind === "results" ? page.result.periodStart : page.periodStart, page.kind === "results" ? page.result.periodEnd : page.periodEnd)}
                </AppText>
              </div>
            )}
            <Dialog.Title ref={heading} tabIndex={-1}>{title}</Dialog.Title>
          </header>

          <WeekRecapFit>
            {page.kind === "arrival" ? (
              <div className="week-recap-arrival">
                <Ember style={{ width: 180, height: 180 }} />
                <AppParagraph>Your effort added up. Let’s see where it took you.</AppParagraph>
              </div>
            ) : page.kind === "results" ? (
              <ResultsView state={state} result={page.result} replay={replays[page.result.id] ?? null} hiddenIds={hiddenIds} reduced={Boolean(reduced)} />
            ) : <Training state={state} target={{ sport: page.sport, periodStart: page.periodStart, periodEnd: page.periodEnd, result: page.result }} />}
          </WeekRecapFit>

          <footer className="week-recap-footer">
            {page.kind === "arrival" ? (
              <button type="button" className="fb-btn" onClick={() => setIndex(current + 1)}>{label}</button>
            ) : page.kind === "results" ? (
              <>
                <div className="week-recap-footer-row">
                  <CompetitionReplayButton state={state} selection={page.result} label="Replay round" variant="recap" />
                  <button type="button" className="fb-btn" onClick={() => setIndex(current + 1)}>{label}</button>
                </div>
                {social && (
                  <div className="week-recap-link-row">
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
                  </div>
                )}
              </>
            ) : (
              <div className="week-recap-footer-row">
                <Link
                  href="/app/athlete?panel=preferences"
                  className="week-recap-secondary-btn"
                  onClick={() => {
                    if (typeof window !== "undefined") window.sessionStorage.setItem(RESUME_INDEX_KEY, String(current));
                  }}
                >
                  <AppText role="label">Update settings</AppText>
                </Link>
                <button
                  type="button"
                  className="fb-btn"
                  onClick={() => {
                    if (last) {
                      if (typeof window !== "undefined") window.sessionStorage.removeItem(RESUME_INDEX_KEY);
                      onDismiss();
                    } else {
                      setIndex(current + 1);
                    }
                  }}
                >
                  {label}
                </button>
              </div>
            )}
          </footer>
        </motion.div>
      </Dialog.Content>
    </Dialog.Portal></Dialog.Root>
  );
}

function ResultsView({ state, result, replay, hiddenIds, reduced }: {
  state: CompeteState; result: PeriodResult; replay: CompetitionReplay | null; hiddenIds: readonly string[]; reduced: boolean;
}) {
  const highlights = useMemo(() => weekRecapHighlights(replay, state, result, hiddenIds), [replay, state, result, hiddenIds]);
  return (
    <div className="week-recap-results-wrap">
      <PodiumHero replay={replay} state={state} result={result} hiddenIds={hiddenIds} reduced={reduced} />
      <div className="week-recap-highlights">
        {highlights.map((item) => (
          <div key={item.title} className="week-recap-glass week-recap-highlight-row">
            <span className={`week-recap-highlight-icon is-${item.tone}`}>
              <RecapIcon name={item.icon} size={18} />
            </span>
            <div className="week-recap-highlight-text">
              <AppText role="label">{item.title}</AppText>
              <AppText role="caption" className="week-recap-muted-text">{item.detail}</AppText>
            </div>
          </div>
        ))}
      </div>
      <ResultCard key={result.id} result={result} units={state.units} variant="recap" replay={replay} hiddenIds={hiddenIds} account={state} />
    </div>
  );
}

function PodiumHero({ replay, state, result, hiddenIds, reduced }: {
  replay: CompetitionReplay | null; state: CompeteState; result: PeriodResult; hiddenIds: readonly string[]; reduced: boolean;
}) {
  const slots = useMemo(() => weekRecapPodium(replay, state, result, hiddenIds), [replay, state, result, hiddenIds]);
  return (
    <div className="week-recap-podium">
      {slots.map(({ step, entry }) => {
        const isFirst = step === 1;
        const avatarSize = isFirst ? 54 : 44;
        const stepClass = STEP_CLASS[step];
        const meta = PODIUM_STEP[step];
        return (
          <motion.div
            key={`${result.id}-${step}`}
            className={`week-recap-podium-col ${stepClass}`}
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.34, delay: reduced ? 0 : STEP_DELAY[step], ease: "easeOut" }}
          >
            <div className="week-recap-podium-athlete">
              <div className="week-recap-avatar-frame">
                {entry ? (
                  <UserAvatar src={entry.avatarUrl} name={entry.name} size={avatarSize} decorative />
                ) : <span className="week-recap-empty-avatar" style={{ width: avatarSize, height: avatarSize }}>—</span>}
              </div>
              <AppText role="label" className={`week-recap-podium-name${entry?.you ? " is-you" : ""}`}>{entry?.name ?? "—"}</AppText>
              {entry && <AppText role="caption" className="week-recap-podium-metric">{entry.metricLabel}</AppText>}
            </div>
            <div className={`week-recap-pedestal ${stepClass}`} style={{ paddingTop: meta.lipY + 10 }}>
              <svg className="week-recap-pedestal-svg" viewBox="0 0 120 100" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id={`web-pod-top-${step}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={meta.topA} stopOpacity="0.95" />
                    <stop offset="1" stopColor={meta.topB} stopOpacity="0.88" />
                  </linearGradient>
                  <linearGradient id={`web-pod-face-${step}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={meta.faceA} stopOpacity={meta.faceAOpacity} />
                    <stop offset="0.55" stopColor={meta.faceB} stopOpacity={meta.faceBOpacity} />
                    <stop offset="1" stopColor={WEEK_RECAP_COLORS.background} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon points={meta.topPoints} fill={`url(#web-pod-top-${step})`} />
                <rect x="0" y={meta.lipY} width="120" height={100 - meta.lipY} fill={`url(#web-pod-face-${step})`} />
                <path d={`M0 ${meta.lipY} H120`} stroke={meta.lip} strokeWidth="1.6" strokeOpacity="0.6" fill="none" />
                <path d={`M1 ${meta.lipY} V100 M119 ${meta.lipY} V100`} stroke={meta.lip} strokeWidth="1" strokeOpacity="0.18" fill="none" />
              </svg>
              <AppText role="label" className={`week-recap-pedestal-badge ${stepClass}`}>{step}</AppText>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function Training({ state, target }: { state: CompeteState; target: WeekRecapTarget }) {
  const series = weekRecapTraining(state, target);
  const { stats, nextRound } = weekRecapBreakdown(state, target);
  const hr = weekRecapHeartRateRanges(state, target);
  const [chartMode, setChartMode] = useState<"time" | "effort">("time");
  const [scrubbed, setScrubbed] = useState<ChartDatum | undefined>(undefined);
  const activeMode = chartMode === "effort" && series.hasEffort ? "effort" : "time";

  return (
    <section className="week-recap-training">
      <div className="week-recap-stat-cards">
        {stats.map((item) => (
          <div key={item.label} className="week-recap-glass week-recap-stat-cell">
            <span className={`week-recap-stat-icon is-${item.tone}`}><RecapIcon name={item.icon} size={16} /></span>
            <AppText role="metric">{item.value}</AppText>
            <AppText role="caption" className="week-recap-muted-text">{item.label}</AppText>
          </div>
        ))}
      </div>

      <div className="week-recap-glass week-recap-chart-card">
        <div className="week-recap-chart-header">
          <div className="week-recap-chart-title">
            <RecapIcon name="scoring" size={16} />
            <AppText role="label">{scrubbed ? `${scrubbed.label} · ${scrubbed.value}` : activeMode === "time" ? "Training time" : "Effort"}</AppText>
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
          <StandardLineChart height={140} showArea onSelectionChange={setScrubbed}
            stroke={WEEK_RECAP_COLORS.progress} axisColor="rgba(255, 255, 255, 0.18)" labelColor="rgba(249, 247, 236, 0.72)"
            yAxisLabel={activeMode === "time" ? "Training (min)" : "Effort (pts)"} xAxisLabel="Date (ET)"
            values={activeMode === "time" ? series.values : series.effortValues} pointLabels={series.labels}
            xLabels={[series.labels[0]!, series.labels[Math.floor((series.labels.length - 1) / 2)]!, series.labels.at(-1)!]}
            formatAxisY={(v) => (activeMode === "time" ? `${Math.round(v)}` : `${Number(v.toFixed(1))}`)}
            formatY={(v) => (activeMode === "time" ? `${Math.round(v)} min` : `${formatEffort(v)} pts`)}
            ariaLabel={activeMode === "time" ? "Cumulative training minutes in the settled week" : "Cumulative effort points in the settled week"} />
        ) : <AppParagraph>Detailed activity history is unavailable for this archived week.</AppParagraph>}
      </div>

      <div className="week-recap-glass week-recap-hr-card">
        <div className="week-recap-next-header">
          <span className="week-recap-next-title"><RecapIcon name="heart" size={16} /><AppText role="label">Heart-rate zones</AppText></span>
        </div>
        {hr.ranges.length > 0 ? (
          <div className="week-recap-hr-list">
            {hr.ranges.map((row) => (
              <div key={row.id} className="week-recap-hr-row">
                <AppText role="caption" className="week-recap-hr-label">{row.label}</AppText>
                <div className="week-recap-hr-track">
                  <div className={`week-recap-hr-fill is-${row.tone}`} style={{ width: `${Math.max(8, row.pct)}%` }} />
                </div>
                <AppText role="caption" className="week-recap-hr-pct week-recap-muted-text">{row.pct}%</AppText>
              </div>
            ))}
          </div>
        ) : <AppText role="caption" className="week-recap-muted-text">No heart-rate samples recorded this week.</AppText>}
      </div>

      <div className="week-recap-glass week-recap-next-card">
        <div className="week-recap-next-header">
          <span className="week-recap-next-title"><RecapIcon name="calendar" size={16} /><AppText role="label">Next round</AppText></span>
          <AppText role="caption" className={`week-recap-next-pill${nextRound.active ? " is-active" : ""}`}>{nextRound.pill}</AppText>
        </div>
        <AppText role="row" className="week-recap-next-detail">{nextRound.detail}</AppText>
      </div>
    </section>
  );
}
