"use client";

import { Ace } from "@/features/rally/ace";
import { APP_TIMEZONE, dayKey, formatVolume, type Activity, type SportId } from "@fitness-battle/shared";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { HomeLayout } from "./model";
import "./home-concepts.css";

interface HomeConceptProps {
  layout: HomeLayout;
  activities: Activity[];
  sport: SportId;
  now: Date;
  periodStart: Date;
  recommendation: { title: string; minutes: number | null };
  onActivity: (activity: Activity) => void;
  onCoach: () => void;
}

function ActivityDisc({ activity, sport, onOpen, className = "", style }: {
  activity: Activity; sport: SportId; onOpen: () => void; className?: string; style?: CSSProperties;
}) {
  const volume = formatVolume(sport, activity.distanceM, activity.movingSec);
  return <button className={`hc-disc hc-past ${className}`} style={style} onClick={onOpen} aria-label={`${new Date(activity.startedAt).toLocaleDateString("en-US", { weekday: "long", timeZone: APP_TIMEZONE })}, ${volume}. Open activity`}>
    <span aria-hidden="true">✓</span><b>{volume}</b>
  </button>;
}

function Recommendation({ value }: { value: HomeConceptProps["recommendation"] }) {
  return <div className="hc-recommendation"><span>Today</span><h1>{value.title}</h1>{value.minutes != null && <small>{value.minutes} min</small>}</div>;
}

function TodayDisc({ onOpen, className = "", style }: { onOpen: () => void; className?: string; style?: CSSProperties }) {
  return <button className={`hc-disc hc-today ${className}`} style={style} onClick={onOpen} aria-label="Ace at today’s checkpoint. Open recommendation and coaching"><Ace /><span className="hc-disc-top" aria-hidden="true" /></button>;
}

function FutureDisc({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`hc-disc hc-future ${className}`} style={style} role="img" aria-label="Future checkpoint, no activity scheduled"><span aria-hidden="true" /></div>;
}

export function HomeConcept(props: HomeConceptProps) {
  const { layout, activities, sport, onActivity, onCoach, recommendation } = props;
  const past = activities.slice(-2);
  const [deckIndex, setDeckIndex] = useState(0);
  const [gesture, setGesture] = useState<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => { setDeckIndex(0); }, [layout, activities.length]);
  const volume = (activity: Activity) => formatVolume(sport, activity.distanceM, activity.movingSec);

  if (layout === "trail") return <section className="hc-checkpoints" aria-label="Winding activity checkpoints">
    <svg className="hc-route" viewBox="0 0 320 570" preserveAspectRatio="none" aria-hidden="true"><path d="M 105 42 C 105 85, 225 75, 225 115 S 148 158, 148 235 S 75 396, 75 434 S 236 450, 236 488 S 155 514, 155 543" /></svg>
    {past[0] && <ActivityDisc activity={past[0]} sport={sport} onOpen={() => onActivity(past[0]!)} className="hc-checkpoint-first" />}
    {past[1] && <ActivityDisc activity={past[1]} sport={sport} onOpen={() => onActivity(past[1]!)} className="hc-checkpoint-second" />}
    <TodayDisc onOpen={onCoach} className="hc-checkpoint-now" />
    <div className="hc-checkpoint-copy"><Recommendation value={recommendation} /></div>
    <FutureDisc className="hc-checkpoint-future-one" /><FutureDisc className="hc-checkpoint-future-two" /><FutureDisc className="hc-checkpoint-future-three" />
  </section>;

  if (layout === "circuit") return <section className="hc-circuit" aria-label="Weekly movement circuit">
    <div className="hc-oval" aria-hidden="true"><div /><div /></div>
    {past[0] && <ActivityDisc activity={past[0]} sport={sport} onOpen={() => onActivity(past[0]!)} className="hc-circuit-first" />}
    {past[1] && <ActivityDisc activity={past[1]} sport={sport} onOpen={() => onActivity(past[1]!)} className="hc-circuit-second" />}
    <TodayDisc onOpen={onCoach} className="hc-circuit-now" />
    <div className="hc-circuit-copy"><Recommendation value={recommendation} /></div>
    <FutureDisc className="hc-circuit-future-one" /><FutureDisc className="hc-circuit-future-two" />
  </section>;

  if (layout === "calendar") {
    const todayKey = dayKey(props.now);
    return <section className="hc-calendar" aria-label="Your activity week">
      <div className="hc-week-strip">
        {Array.from({length:7}, (_, index) => {
          const day = new Date(props.periodStart.getTime()+index*86400000);
          const key = dayKey(day);
          const entries = activities.filter(a => dayKey(new Date(a.startedAt))===key);
          const isToday = key === todayKey;
          const future = key > todayKey;
          return <div key={key} className={`hc-calendar-day ${isToday ? "is-today" : ""}`}>
            <span aria-label={day.toLocaleDateString("en-US",{weekday:"long",timeZone:APP_TIMEZONE})}>{day.toLocaleDateString("en-US",{weekday:"narrow",timeZone:APP_TIMEZONE})}</span>
            {isToday ? <span className="hc-day-current" aria-hidden="true" /> : entries.length && !future ? <button onClick={() => onActivity(entries.at(-1)!)} aria-label={`${entries.length} activities on ${key}. Open latest activity`}>✓</button> : <span className="hc-day-empty" role="img" aria-label={future ? "Future day, nothing scheduled" : "No activity recorded"} />}
          </div>;
        })}
      </div>
      <div className="hc-calendar-now"><TodayDisc onOpen={onCoach} /><Recommendation value={recommendation} /></div>
      <div className="hc-calendar-history">{activities.slice(-3).map(a => <button key={a.id} onClick={() => onActivity(a)}><b>{volume(a)}</b><span>{new Date(a.startedAt).toLocaleDateString("en-US",{weekday:"short",timeZone:APP_TIMEZONE})}</span></button>)}</div>
    </section>;
  }

  if (layout === "islands") return <section className="hc-islands" aria-label="Activity islands">
    <div className="hc-island-ground hc-island-today" aria-hidden="true" />
    <div className="hc-islands-copy"><Recommendation value={recommendation} /></div>
    <TodayDisc onOpen={onCoach} className="hc-islands-now" />
    {past[0] && <ActivityDisc activity={past[0]} sport={sport} onOpen={() => onActivity(past[0]!)} className="hc-island-first" />}
    {past[1] && <ActivityDisc activity={past[1]} sport={sport} onOpen={() => onActivity(past[1]!)} className="hc-island-second" />}
    <div className="hc-island-ground hc-island-empty" aria-label="Empty space for future movement" role="img" />
  </section>;

  const cards = [...activities].reverse();
  const selected = deckIndex > 0 ? cards[deckIndex-1] : null;
  const deckLength = cards.length+1;
  const step = (delta: number) => setDeckIndex(index => Math.max(0, Math.min(deckLength-1,index+delta)));
  const release = (event: PointerEvent) => {
    if (gesture) {
      const dx = event.clientX-gesture.x, dy = event.clientY-gesture.y;
      if (Math.abs(dx)>50 && Math.abs(dx)>Math.abs(dy)*1.3) { suppressClick.current=true; step(dx<0 ? 1 : -1); }
    }
    setGesture(null);
  };
  return <section className="hc-deck" aria-label="Swipeable activity cards">
    <div className="hc-deck-stack" onPointerDown={event => { if (event.button !== 0) return; suppressClick.current=false; setGesture({x:event.clientX,y:event.clientY}); }} onPointerUp={release} onPointerCancel={() => setGesture(null)} onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current=false; } }}>
      {deckLength>1 && <><div className="hc-card-under hc-card-under-two" aria-hidden="true" /><div className="hc-card-under" aria-hidden="true" /></>}
      <div className="hc-deck-card">
        {selected ? <><button className="hc-deck-activity" onClick={() => onActivity(selected)} aria-label={`Open ${volume(selected)} activity`}><span className="hc-deck-medal" aria-hidden="true">✓</span><strong>{volume(selected)}</strong><span>{Math.round(selected.movingSec/60)} min</span></button></> : <><button className="hc-deck-ace" aria-label="Open today’s recommendation and coaching" onClick={onCoach}><Ace /></button><Recommendation value={recommendation} /></>}
      </div>
    </div>
    <div className="hc-deck-pagination" aria-label="Card navigation"><button disabled={deckIndex===0} aria-label="Previous activity card" onClick={() => step(-1)}>←</button><span aria-live="polite">{deckIndex+1} / {deckLength}</span><button disabled={deckIndex===deckLength-1} aria-label="Next activity card" onClick={() => step(1)}>→</button></div>
  </section>;
}
