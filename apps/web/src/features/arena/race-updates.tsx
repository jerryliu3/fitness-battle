"use client";
import { APP_TIMEZONE, type CompeteState, type SportId } from "@fitness-battle/shared";
import { AppHeading, AppParagraph, AppText } from "@/ui/section";
import { CompeteIcon } from "./event-home";
import { useEventActivity } from "./use-event-activity";

export function RaceUpdates({ state, sport, active }: { state: CompeteState; sport: SportId; active: boolean }) {
  const { rows, loading, error, scope, retry } = useEventActivity(state, sport, active);
  if (!active) return null;
  return <section className="race-updates" aria-label="Race updates"><div className="compete-section-heading"><AppHeading>Race updates</AppHeading><AppText role="caption" secondary>This wave</AppText></div>
    {error ? <div role="status"><AppParagraph>{error}</AppParagraph><button type="button" className="fb-btn-line" onClick={() => retry()}>Retry</button></div> : loading ? <AppParagraph typographyRole="caption">Loading race updates…</AppParagraph> : <>
      {!rows.length && <AppParagraph className="ui-text-secondary">No counted activity in this wave yet.</AppParagraph>}
      <ol>{rows.map(row => <li key={row.id}><span className="race-update-icon"><CompeteIcon name={row.movement ? "distance" : sport} size={22} /></span><div><AppText role="label">{row.title}</AppText><AppText role="caption" secondary>{row.detail}{row.simulated ? " · Simulated" : ""}</AppText><time dateTime={row.at}>{new Date(row.at).toLocaleString("en-US", { timeZone: APP_TIMEZONE, weekday: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</time></div></li>)}</ol>
      <AppParagraph typographyRole="caption" className="ui-text-secondary">{scope === "local" ? "Local preview · includes simulated activity." : "Workout order from current counted activities."}</AppParagraph>
    </>}
  </section>;
}
