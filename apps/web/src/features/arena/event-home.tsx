"use client";
import Link from "next/link";
import { useState } from "react";
import { competeEventCarouselPageIndex, formatActivityAge, COMPETE_ART, COMPETE_CATEGORIES, COMPETE_ICONS, SPORT_ICON_PATHS, SPORTS, buildArenaModel, competitionQueue, competitionTrack, competeNow, competeHomeResult, type CompeteEvent, type CompeteState, type SportId } from "@fitness-battle/shared";
import { AppHeading, AppText } from "@/ui/section";
import { useEventActivity } from "./use-event-activity";
import { CoursePreview } from "./course-preview";
import "./event-home.css";

export function CompeteIcon({ name, size = 26 }: { name: keyof typeof COMPETE_ICONS | CompeteEvent; size?: number }) {
  const path = name in COMPETE_ICONS ? COMPETE_ICONS[name as keyof typeof COMPETE_ICONS] : SPORT_ICON_PATHS[name as keyof typeof SPORT_ICON_PATHS];
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>;
}
export function EventArt({ event }: { event: CompeteEvent }) {
  return <svg className="compete-art" aria-hidden="true" viewBox="0 0 240 160" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round">{COMPETE_ART[event].map(path => <path key={path} d={path} />)}</svg>;
}

export function EventHome({ state, onEnter, onRecovery, onRegister, active: enabled }: { active: boolean; state: CompeteState; onEnter(sport: SportId): void; onRecovery(): void; onRegister(): void }) {
  const [page, setPage] = useState(0);
  const active = state.ratings.filter(r => r.optedIn);
  const sleep = state.healthRatings.some(r => r.optedIn);
  const count = active.length + Number(sleep);
  return <>
    <section className="compete-home-section" aria-label="Your events">
      <div className="compete-section-heading"><AppHeading>Your events</AppHeading><AppText role="caption" secondary>{active.length + Number(sleep)} registered</AppText></div>
      <div className="compete-carousel compete-races" tabIndex={0} aria-label="Registered events carousel" onScroll={event => { const el = event.currentTarget; const width = el.firstElementChild?.getBoundingClientRect().width ?? 0; setPage(competeEventCarouselPageIndex(el.scrollLeft, width + 12, count)); }}>
        {active.map(rating => <RegisteredEventCard key={rating.sport} state={state} sport={rating.sport} active={enabled} onEnter={() => onEnter(rating.sport)} />)}
        {sleep && <button type="button" className="compete-recovery-card" onClick={onRecovery}><EventArt event="sleep" /><CompeteIcon name="sleep" /><AppHeading>Recovery</AppHeading><AppText secondary>Sleep competition</AppText><AppText role="label">View event →</AppText></button>}
      </div>
      {count > 1 && <div className="compete-carousel-dots" aria-label={`Event ${Math.min(page + 1, count)} of ${count}`}>{Array.from({ length: count }, (_, index) => <span key={index} data-active={index === Math.min(page, count - 1)} />)}</div>}
      {!active.length && !sleep && <button className="compete-empty" onClick={() => onRegister()}><CompeteIcon name="wreath" /><AppText role="label">Join your first event</AppText><AppText role="caption" secondary>Choose a sport below to find your field.</AppText></button>}
    </section>
  </>;
}

function RegisteredEventCard({ state, sport, active, onEnter }: { state: CompeteState; sport: SportId; active: boolean; onEnter(): void }) {
  const now = competeNow(state);

  const queue = competitionQueue(state, sport, now);
  const queued = Boolean(queue?.queued || queue?.awaitingField);
  const model = buildArenaModel(state, undefined, competitionTrack(sport), sport);
  const lanes = model.lanes.filter(lane => !lane.ghost);
  const total = lanes.find(lane => lane.you)?.values[2] ?? 0;
  const place = 1 + lanes.filter(lane => lane.values[2] > total).length;
  const { rows } = useEventActivity(state, sport, active && !queued);
  const update = formatActivityAge(rows[0]?.at, now);
  return <article className="compete-race-card">
    <div className="compete-race-heading"><span className="compete-sport-icon"><CompeteIcon name={sport} /></span><div><AppText role="label">{SPORTS.find(s => s.id === sport)?.name}</AppText><AppText role="caption" className={queued ? "" : "compete-live"} secondary={queued}>{queued ? "Upcoming wave" : "Live"}</AppText></div>{!queued && <AppText role="caption" secondary>Place {place} / {lanes.length}</AppText>}</div>
    <CoursePreview sport={sport} queued={queued} state={state} />
    <button type="button" className="compete-race-entry" aria-label={`Enter ${SPORTS.find(s => s.id === sport)?.name} field`} onClick={onEnter}><AppText role="caption" secondary>{queued ? "Your race opens with the wave" : `Last update: ${update === "—" ? "Unavailable" : update}${rows[0]?.simulated ? " · Simulated" : ""}`}</AppText><span aria-hidden="true">→</span></button>
  </article>;
}

export function ExploreEvents({ onChoose }: { onChoose(event: CompeteEvent): void }) {
  return <section className="compete-home-section" aria-label="Explore events">
    <AppHeading>Explore events</AppHeading>
    {COMPETE_CATEGORIES.map(category => <div key={category.id} className="compete-category">
      <div className="compete-section-heading"><div><CompeteIcon name={category.id === "recovery" ? "sleep" : category.id} size={22} /><AppHeading role="label" level={3}>{category.title}</AppHeading></div><AppText role="caption" secondary>{category.detail}</AppText></div>
      <div className={`compete-carousel compete-sports is-${category.id}`} tabIndex={0} aria-label={`${category.title} events carousel`}>
        {category.events.map(event => <button type="button" key={event} className="compete-sport-card" onClick={() => onChoose(event)}><EventArt event={event} /><CompeteIcon name={event} size={28} /><AppText role="label">{event[0].toUpperCase() + event.slice(1)}</AppText></button>)}
      </div>
    </div>)}
  </section>;
}

export function CompeteResults({ state }: { state: CompeteState }) {
  const result = competeHomeResult(state);
  return <section className="compete-home-section" aria-label="Results and rankings"><AppHeading>Results & rankings</AppHeading>
    <div className="compete-result-grid">
      {[{ label: "Latest result", ...result, icon: "trophy" as const, action: "Competition history", href: "/you/history", art: "cycling" as const }, { label: "All time", value: "Race rankings", detail: "Personal bests & leaderboards", icon: "crown" as const, action: "All-time standings", href: "/pace", art: "sleep" as const }].map(item => <Link key={item.label} href={item.href} className="compete-result-card"><div><EventArt event={item.art} /><CompeteIcon name={item.icon} /><AppText role="caption" secondary>{item.label}</AppText><AppHeading>{item.value}</AppHeading><AppText role="caption" secondary>{item.detail}</AppText></div><footer><AppText role="caption">{item.action}</AppText><span aria-hidden="true">→</span></footer></Link>)}
    </div>
  </section>;
}

export function CrewEvents({ onChoose }: { onChoose(sport: SportId): void }) {
  return <section className="compete-home-section" aria-label="Special events"><div className="compete-carousel compete-features" tabIndex={0} aria-label="Crew events carousel">
    {SPORTS.map(sport => <button type="button" key={sport.id} className="compete-feature-banner" onClick={() => onChoose(sport.id)}>
      <EventArt event={sport.id} />
      <AppText role="caption" className="compete-feature-badge"><CompeteIcon name="crew" size={16} /> Crew event</AppText>
      <AppHeading>{sport.name} with your crew</AppHeading>
      <AppText role="caption">Share the field. Set your own pace.</AppText>
      <span className="compete-feature-arrow" aria-hidden="true">→</span>
    </button>)}
  </div></section>;
}
