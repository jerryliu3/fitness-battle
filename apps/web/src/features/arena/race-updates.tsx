"use client";
import { useLayoutEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { UserAvatar } from "@/ui/user-avatar";
import { RankAvatar } from "@/ui/rank-symbol";
import { useCompetitionTimeline } from "./competition-timeline-context";
import { APP_TIMEZONE, competitionActivityLog, type CompeteState, type SportId } from "@fitness-battle/shared";
import { AppParagraph, AppText } from "@/ui/section";
import { CompeteIcon } from "./event-home";
import { useEventActivity } from "./use-event-activity";

export function RaceUpdates({ state, sport, active }: { state: CompeteState; sport: SportId; active: boolean }) {
  const timeline = useCompetitionTimeline();
  const fallback = useEventActivity(state, sport, active && !timeline);
  const completed = Math.floor(timeline?.cursor ?? 0);
  const rows = useMemo(() => timeline?.index ? competitionActivityLog(timeline.index, [], completed) : timeline ? [] : fallback.rows, [timeline?.index, completed, fallback.rows]);
  const loading = timeline ? !timeline.ready : fallback.loading;
  const error = timeline?.error ?? fallback.error;
  const retry = timeline?.retry ?? fallback.retry;
  const cursor = timeline?.cursor ?? rows.length;
  const reduced = useReducedMotion();
  const previous = useRef<{ cursor: number; ready: boolean; ids: Set<string> } | null>(null);
  const forward = previous.current?.ready === true && cursor > previous.current.cursor;
  useLayoutEffect(() => { previous.current = { cursor, ready: timeline ? timeline.ready : !fallback.loading, ids: new Set(rows.map(row => row.id)) }; }, [rows, cursor, timeline?.ready, fallback.loading]);
  if (!active) return null;
  return <section className="race-updates" aria-label="Race updates">
    {error ? <div role="status"><AppParagraph>{error}</AppParagraph><button type="button" className="fb-btn-line" onClick={() => retry()}>Retry</button></div> : loading ? <AppParagraph typographyRole="caption">Loading race updates…</AppParagraph> : <>
      {!rows.length && <AppParagraph className="ui-text-secondary">No activity at this point in the race.</AppParagraph>}
      <ol>{rows.map(row => <motion.li key={row.id} layout={!reduced} initial={!reduced && forward && !previous.current?.ids.has(row.id) ? { opacity: 0, y: -16 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.24 }}>{!row.movement ? <RankAvatar rank="beginner" src={row.avatarUrl} name={row.actorName} size={48} /> : <span className="race-update-icon"><CompeteIcon name="distance" size={22} /></span>}<div><AppText role="label">{row.title}</AppText><AppText role="caption" secondary>{row.detail}</AppText><time dateTime={row.at}>{new Date(row.at).toLocaleString("en-US", { timeZone: APP_TIMEZONE, weekday: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</time></div></motion.li>)}</ol>
    </>}
  </section>;
}
