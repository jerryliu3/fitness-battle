"use client";
import { useState } from "react";
import { AppHeading, AppParagraph, AppText } from "@/ui/section";
import { competitionQueue, type CompeteState, type SportId } from "@fitness-battle/shared";

export function QueuedField({ state, event, now, onCancel, overlay = false }: { state: CompeteState; event: SportId | "sleep"; now: Date; onCancel: () => void; overlay?: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const queue = competitionQueue(state, event, now);
  if (!queue) return null;
  if (overlay && !expanded) return <button type="button" className="wave-queue-chip fb-btn-line" onClick={() => setExpanded(true)}>Wave details · {queue.startsLabel}</button>;
  return <section className={`focus-card wave-queue${overlay ? " is-overlay" : ""}`} aria-label={`Upcoming competition: you and ${queue.mysteryCount} mystery competitors`}>
    {overlay && <button type="button" className="wave-queue-close fb-btn-ghost" aria-label="Minimize wave details" onClick={() => setExpanded(false)}>−</button>}
    <AppText role="label">{queue.queued ? "You're registered" : "Your wave has started"}</AppText>
    <AppHeading level={2} role="heading">{queue.queued ? "Finding your competitors" : "Revealing your field"}</AppHeading>
    <AppParagraph typographyRole="body" className="fb-copy">{queue.queued
      ? "We're matching athletes at your level. Your competitors will be revealed when the wave starts."
      : "Your shared field is loading. Your activity counts from the start time below."}</AppParagraph>
    <dl className="wave-times"><div><dt>Starts</dt><dd>{queue.startsLabel}</dd></div><div><dt>Ends</dt><dd>{queue.endsLabel}</dd></div></dl>
    {queue.queued ? <><AppParagraph typographyRole="caption" className="fb-note">Everyone starts at zero. Only activity from your wave's start counts. Sync before the end time; late uploads stay in training.</AppParagraph>
      <button type="button" className="fb-btn-line" onClick={onCancel}>Cancel registration</button></> : null}
  </section>;
}
