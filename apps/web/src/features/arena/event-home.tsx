"use client";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { competeEventCarouselPageIndex, formatActivityAge, COMPETE_ART, COMPETE_ART_COLORS, COMPETE_CATEGORIES, competeHomeRank, COMPETE_ICONS, SPORT_ICON_PATHS, SPORTS, buildArenaModel, competitionQueue, competitionTrack, competeNow, competeHomeResult, type CompeteEvent, type CompeteState, type SportId } from "@fitness-battle/shared";
import { AppHeading, AppText } from "@/ui/section";
import { useEventActivity } from "./use-event-activity";
import { CoursePreview } from "./course-preview";
import "./event-home.css";

export function CompeteIcon({ name, size = 26 }: { name: keyof typeof COMPETE_ICONS | CompeteEvent; size?: number }) {
  const path = name in COMPETE_ICONS ? COMPETE_ICONS[name as keyof typeof COMPETE_ICONS] : SPORT_ICON_PATHS[name as keyof typeof SPORT_ICON_PATHS];
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={path} fill={name in SPORT_ICON_PATHS ? "currentColor" : "none"} stroke={name in SPORT_ICON_PATHS ? "none" : undefined} /></svg>;
}
export function EventArt({ event, gold = false }: { event: CompeteEvent; gold?: boolean }) {
  return <svg className="compete-art" aria-hidden="true" viewBox="0 0 240 160" preserveAspectRatio="none">{COMPETE_ART[event].map((path, index) => <path key={path} d={path} fill={index === 0 || event === "sleep" ? gold ? "var(--app-podium-gold)" : COMPETE_ART_COLORS[event] : "none"} fillOpacity={index === 0 ? 0.45 : 0.25} stroke={event === "running" || event === "cycling" ? "var(--card)" : "none"} strokeWidth={index === 0 ? 0 : 3} />)}</svg>;
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
    <div className="compete-race-heading"><span className="compete-sport-icon"><CompeteIcon name={sport} /></span><div><AppText role="label">{SPORTS.find(s => s.id === sport)?.name}</AppText><div className="compete-last-update">{!queued && <span aria-hidden="true" className="compete-live-dot" data-active={active} />}<AppText role="support" secondary>{queued ? "Upcoming wave" : `last update: ${update === "—" ? "Unavailable" : update}`}</AppText></div></div>{!queued && <AppText role="caption" secondary>Place {place} / {lanes.length}</AppText>}</div>
    <CoursePreview sport={sport} queued={queued} state={state} />
    <button type="button" className="compete-race-entry" aria-label={`Enter ${SPORTS.find(s => s.id === sport)?.name} field`} onClick={onEnter}><AppText role="label">See race</AppText><span aria-hidden="true">→</span></button>
  </article>;
}

export function ExploreEvents({ onChoose }: { onChoose(event: CompeteEvent): void }) {
  const categories = COMPETE_CATEGORIES;
  return <section className="compete-home-section" aria-label="Event registration">
    <AppHeading>Event registration</AppHeading>
    {categories.map(category => <div key={category.id} className="compete-category">
      <div className="compete-section-heading"><div><CompeteIcon name={category.id === "recovery" ? "recovery" : category.id} size={22} /><AppHeading role="label" level={3}>{category.title}</AppHeading></div></div>
      <div className={`compete-carousel compete-sports is-${category.id}`} tabIndex={0} aria-label={`${category.title} events carousel`}>
        {category.events.map(event => <button type="button" key={event} className="compete-sport-card" style={{ "--event-tint": COMPETE_ART_COLORS[event] } as CSSProperties} onClick={() => onChoose(event)}><EventArt event={event} /><CompeteIcon name={event} size={28} /><AppText role="label">{event[0].toUpperCase() + event.slice(1)}</AppText></button>)}
      </div>
    </div>)}
  </section>;
}

export function CompeteResults({ state }: { state: CompeteState }) {
  const result = competeHomeResult(state);
  return <section className="compete-home-section" aria-label="Results and rankings"><AppHeading>Results & rankings</AppHeading>
    <div className="compete-result-grid">
      {[{ label: "Latest result", ...result, icon: "trophy" as const, action: "Competition history", href: "/you/history", art: "cycling" as const }, { label: "Your rank", value: competeHomeRank(state), icon: "crown" as const, action: "All-time standings", href: "/pace", art: "sleep" as const }].map(item => <Link key={item.label} href={item.href} className="compete-result-card"><div><EventArt event={item.art} gold /><CompeteIcon name={item.icon} /><div><AppText role="caption" secondary>{item.label}</AppText><AppHeading>{item.value}</AppHeading></div></div><footer><AppText role="caption">{item.action}</AppText><span aria-hidden="true">→</span></footer></Link>)}
    </div>
  </section>;
}

export function CrewEvents({ onChoose }: { onChoose(sport: SportId): void }) {
  return <section className="compete-home-section" aria-label="Special events"><div className="compete-carousel compete-features" tabIndex={0} aria-label="Crew events carousel">
    {SPORTS.map(sport => <button type="button" key={sport.id} className="compete-feature-banner" onClick={() => onChoose(sport.id)}>
      <EventArt event="running" gold />
      <CompeteIcon name="crew" size={42} />
      <div className="compete-feature-copy"><span className="compete-special-badge"><CompeteIcon name="special" size={12} /><AppText role="caption">Special event</AppText></span><AppHeading role="label">{sport.name} challenge</AppHeading><AppText role="caption">Compete with your crew</AppText></div>
      <span className="compete-feature-arrow" aria-hidden="true">Join →</span>
    </button>)}
  </div></section>;
}
