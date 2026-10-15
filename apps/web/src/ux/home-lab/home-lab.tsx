"use client";

import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { Ace } from "@/features/rally/ace";
import { defaultLook } from "@/features/field/avatar";
import { stableLanes, type SceneRunner } from "@/features/field/geometry";
import { buildSplitBoard } from "@/features/split/model";
import {
  activityEffort, competeNow, countsOnTrack, formatEffort, formatVolume,
  initialsFromName, lessonFor, rankForElo, reduceCompete, sportById, suggestionForState,
  type Activity, type CompeteState,
} from "@fitness-battle/shared";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  fixtureWeek, homeSnapshot, progressGain, readSnapshot, seenKey,
  type HomeLayout, type ProgressSnapshot, type VisitScenario,
} from "./model";
import { HOME_LAYOUTS, parseHomeLayout } from "./model";
import { HomeConcept } from "./home-concepts";
import { HomeSecondaryView, DockIcon } from "./secondary-views";
import "@/features/field/field.css";
import "./home-lab.css";

const Pursuit = dynamic(() => import("@/features/field/components/live-pursuit").then(m => m.LivePursuit), {
  ssr: false, loading: () => <div className="ah-scene-loading">Opening your field…</div>,
});
type Detail = { title: string; body: ReactNode } | null;
function formatDay(at: string) { return new Date(at).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }); }
function valueLabel(value: number, unit: string) { return `${value.toFixed(1)} ${unit}`; }

/** Native modal sheet: direct content, Escape, focus trapping and return focus. */
function DetailSheet({ detail, onClose }: { detail: Detail; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (detail && !ref.current?.open) ref.current?.showModal();
    if (!detail && ref.current?.open) ref.current.close();
  }, [detail]);
  return <dialog ref={ref} className="ah-sheet" aria-labelledby="ah-detail-title" onCancel={onClose} onClose={onClose} onClick={e => { if (e.target === ref.current) onClose(); }}>
    <header><h2 id="ah-detail-title">{detail?.title}</h2><button onClick={onClose} aria-label="Close detail">×</button></header>
    <div className="ah-sheet-body">{detail?.body}</div>
  </dialog>;
}

export function HomeLab() {
  const { state: accountState, dispatch, loadStatus } = useCompete();
  const { user, loading } = useAuth();
  const [layout, setLayout] = useState<HomeLayout>("trail");
  const [scenario, setScenario] = useState<VisitScenario>("quiet");
  const [source, setSource] = useState<"sample" | "account">("sample");
  const [configured, setConfigured] = useState(false);
  const [visit, setVisit] = useState(0);
  const [sample, setSample] = useState(() => fixtureWeek("quiet"));
  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    setSource(params.get("source") === "account" ? "account" : "sample");
    setLayout(parseHomeLayout(params.get("layout")));
    setConfigured(true);
  }, []);
  useEffect(() => {
    if (!configured) return;
    const url = new URL(window.location.href);
    url.searchParams.set("source", source); url.searchParams.set("layout", layout);
    window.history.replaceState(null, "", url);
  }, [configured, source, layout]);
  function simulate(next: VisitScenario) {
    setScenario(next); setSample(fixtureWeek(next)); setSource("sample"); setVisit(v => v + 1);
  }
  const state = source === "sample" ? sample.state : accountState;
  return <div className="ah-lab">
    <aside className="ah-lab-controls" aria-label="Prototype controls">
      <h1>Home concepts</h1>
      <fieldset><legend>Home layout</legend><div className="ah-lab-pills">
        {HOME_LAYOUTS.map(concept => <button key={concept.id} aria-pressed={layout === concept.id} onClick={() => setLayout(concept.id)}>{concept.name}</button>)}
      </div></fieldset>
      <fieldset><legend>Try a return visit</legend><div className="ah-lab-pills">
        <button aria-pressed={source === "sample" && scenario === "quiet"} onClick={() => simulate("quiet")}>Nothing new</button>
        <button aria-pressed={source === "sample" && scenario === "arrival"} onClick={() => simulate("arrival")}>New activity</button>
        <button aria-pressed={source === "sample" && scenario === "unsynced"} onClick={() => simulate("unsynced")}>No tracker sync</button>
      </div></fieldset>
      <div className="ah-data-source"><button aria-pressed={source === "account"} onClick={() => { setSource(s => s === "sample" ? "account" : "sample"); setVisit(v => v + 1); }}>{source === "sample" ? "Use my app data" : "Use sample week"}</button>
        <small>{source === "sample" ? "Sample data · no account writes" : "App data · browser remembers progress"}</small>
      </div>
    </aside>
    <div className="ah-preview">
      {!configured || !state || (source === "account" && (loading || loadStatus === "loading")) ? <div className="ah-phone ah-loading">Loading your movement…</div> :
        <AdaptiveHome key={`${source}:${user?.id ?? "guest"}:${visit}`} state={state} layout={layout}
          accountId={source === "sample" ? "sample" : user?.id ?? "guest"}
          baseline={source === "sample" ? sample.previous : undefined}
          persist={source === "account" && loadStatus !== "failed"}
          failed={source === "account" && loadStatus === "failed"}
          sampleMode={source === "sample"} unsynced={source === "sample" && scenario === "unsynced"}
          completeLesson={() => {
            if (source === "sample") setSample(s => ({ ...s, state: reduceCompete(s.state, { type: "complete-lesson" }) }));
            else if (loadStatus !== "failed" && user) dispatch({ type: "complete-lesson" });
          }} canComplete={source === "sample" || (Boolean(user) && loadStatus !== "failed")} />}
    </div>
  </div>;
}

function AdaptiveHome({ state, layout, accountId, baseline, persist, failed, sampleMode, unsynced, completeLesson, canComplete }: {
  state: CompeteState; layout: HomeLayout; accountId: string; baseline?: ProgressSnapshot;
  persist: boolean; failed: boolean; sampleMode: boolean; unsynced: boolean;
  completeLesson: () => void; canComplete: boolean;
}) {
  const snapshot = useMemo(() => homeSnapshot(state), [state]);
  const board = useMemo(() => buildSplitBoard(state, state.primary, "open", competeNow(state)), [state]);
  const [arrival, setArrival] = useState<{ previous: ProgressSnapshot; current: ProgressSnapshot; reveal: boolean } | null>(null);
  const handled = useRef("");
  const inMemory = useRef<ProgressSnapshot | null>(baseline ?? null);
  const [view, setView] = useState<"today" | "arena" | "progress" | "athlete">("today");
  const previousLayout = useRef(layout);
  const [detail, setDetail] = useState<Detail>(null);
  const [scene, setScene] = useState<"2d" | "3d">("2d");
  const [sceneUnavailable, setSceneUnavailable] = useState(false);
  const [fullField, setFullField] = useState(false);
  const [progress, setProgress] = useState(1);
  const [replay, setReplay] = useState(0);
  const [finished, setFinished] = useState(false);
  const now = competeNow(state);
  const sport = sportById(state.primary);
  const unit = sport.gps ? "km" : "pts";
  const today = state.primary === "running" ? suggestionForState(state, now) : lessonFor(state.primary, now);
  const lesson = lessonFor(state.primary, now);
  const done = state.lessonDoneOn === now.toISOString().slice(0, 10);
  const activities = board.weekActivities.filter(a => countsOnTrack(a, "open") && new Date(a.startedAt) <= now);
  const gain = arrival ? progressGain(arrival.previous, arrival.current) : null;
  const saveSeen = useCallback((value: ProgressSnapshot) => {
    inMemory.current = value;
    if (!persist) return;
    try { localStorage.setItem(seenKey(accountId, value), JSON.stringify(value)); } catch { /* Use session memory when storage is blocked. */ }
  }, [persist, accountId]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [view, layout]);
  useEffect(() => {
    if (previousLayout.current === layout) return;
    previousLayout.current = layout;
    setView("today");
  }, [layout]);

  useEffect(() => {
    const signature = JSON.stringify(snapshot);
    if (handled.current === signature) return;
    handled.current = signature;
    let previous = inMemory.current;
    if (persist) {
      try { previous = readSnapshot(localStorage.getItem(seenKey(accountId, snapshot))) ?? previous; } catch { /* Storage is optional. */ }
    }
    const reveal = !failed && Boolean(progressGain(previous, snapshot));
    setArrival({ previous: previous?.scope === snapshot.scope ? previous : snapshot, current: snapshot, reveal });
    setFinished(!reveal); setProgress(reveal ? 0 : 1);
    if (reveal) { setView("arena"); setScene("2d"); setDetail(null); }
    else saveSeen(snapshot);
  }, [snapshot, persist, accountId, saveSeen, failed]);

  useEffect(() => {
    if (!arrival?.reveal && replay === 0) return;
    let frame = 0;
    let start: number | null = null;
    setProgress(0); setFinished(false);
    function finish() { setProgress(1); setFinished(true); saveSeen(arrival!.current); }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); return; }
    const tick = (time: number) => {
      start ??= time;
      const elapsed = Math.max(0, time - start - 400);
      const fraction = Math.min(1, elapsed / 1800);
      setProgress(1 - Math.pow(1 - fraction, 3));
      if (fraction < 1) frame = requestAnimationFrame(tick); else finish();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [arrival, replay, saveSeen]);

  const scenes = useMemo<SceneRunner[]>(() => snapshot.lanes.map(lane => {
    const old = arrival?.previous.lanes.find(l => l.id === lane.id)?.value ?? lane.value;
    return { id: lane.id, name: lane.name, initials: initialsFromName(lane.name), you: lane.you, series: [0, old, lane.value] };
  }), [snapshot, arrival]);
  const peak = Math.max(5, ...snapshot.lanes.map(l => l.value), ...(arrival?.previous.lanes.map(l => l.value) ?? []));
  const scale = Math.ceil(peak / 5) * 5;
  const you = snapshot.lanes.find(l => l.you)!;
  const oldYou = arrival?.previous.lanes.find(l => l.you)?.value ?? you.value;
  const shownYou = oldYou + (you.value - oldYou) * progress;
  const rank = 1 + snapshot.lanes.filter(l => !l.you && l.value > you.value).length;
  const oldRank = arrival ? 1 + arrival.previous.lanes.filter(l => !l.you && l.value > oldYou).length : rank;
  const currentRank = 1 + snapshot.lanes.filter(l => {
    if (l.you) return false;
    const old = arrival?.previous.lanes.find(previous => previous.id === l.id)?.value ?? l.value;
    return old + (l.value - old) * progress > shownYou;
  }).length;
  const nearby = snapshot.lanes.filter(l => !l.you).sort((a,b) => Math.abs(a.value-you.value)-Math.abs(b.value-you.value)).slice(0,2);
  const visibleLanes = stableLanes(fullField ? snapshot.lanes : [...nearby,you]);

  function openActivity(activity: Activity) {
    const elapsed = activities.filter(a => a.startedAt <= activity.startedAt);
    setDetail({ title: `${formatDay(activity.startedAt)}’s ${sport.name.toLowerCase()}`, body: <>
      <p className="ah-eyebrow">{sampleMode ? "SAMPLE ACTIVITY" : `${activity.source.toUpperCase()} · COUNTED`}</p>
      <strong className="ah-sheet-number">{formatVolume(state.primary, activity.distanceM, activity.movingSec)}</strong>
      <div className="ah-stat-row"><div><b>{Math.round(activity.movingSec / 60)} min</b><span>Moving time</span></div><div><b>{formatEffort(activityEffort(activity))}</b><span>Effort points</span></div></div>
      <p>This brought your week to <b>{formatVolume(state.primary, elapsed.reduce((sum,a) => sum + a.distanceM, 0), elapsed.reduce((sum,a) => sum + a.movingSec, 0))}</b>.</p>
      <button className="ah-primary" onClick={() => { setDetail(null); setView("arena"); }}>See it in the arena ↗</button>
    </> });
  }
  function openWeek() {
    setDetail({ title: "Your week, move by move.", body: <>
      <p className="ah-eyebrow">{board.periodLabel} · {activities.length} COUNTED ACTIVITIES</p>
      <strong className="ah-sheet-number">{formatVolume(state.primary, snapshot.distanceM, snapshot.movingSec)}</strong>
      <div className="ah-week-moves">{activities.map(a => <button key={a.id} onClick={() => openActivity(a)}><span>{formatDay(a.startedAt)}</span><b>{formatVolume(state.primary,a.distanceM,a.movingSec)}</b><small>{Math.round(a.movingSec/60)} min ↗</small></button>)}</div>
      {!activities.length && <p>Your counted activities will appear here after an import.</p>}
      <Link href="/progress" className="ah-text-link">Explore your progress ↗</Link>
    </> });
  }
  function openCoach() {
    setDetail({ title: today.title, body: <>
      <Ace /><p>{today.detail}</p>
      <h3>{lesson.title}</h3><p>{lesson.detail}</p>
      <button className="ah-primary" disabled={done || !canComplete} onClick={() => { completeLesson(); setDetail(null); }}>{done ? "Tip completed ✓" : "Got it · complete tip"}</button>
      {!canComplete && <Link href="/login" className="ah-text-link">Sign in to save lesson progress ↗</Link>}
      <p className="ah-small">This completes the tip, not a workout.</p>
    </> });
  }
  function openAthlete(laneId: string) {
    if (laneId === you.id) { openWeek(); return; }
    const lane = snapshot.lanes.find(l => l.id === laneId)!;
    const gap = lane.value - you.value;
    setDetail({ title: lane.name, body: <>
      <p className="ah-eyebrow">THIS WEEK · {sport.name.toUpperCase()}</p><strong className="ah-sheet-number">{valueLabel(lane.value,unit)}</strong>
      <p>{Math.abs(gap).toFixed(1)} {unit} {gap > 0 ? "ahead of you" : "behind you"}.</p>
      <div className="ah-comparison"><span>You <b>{valueLabel(you.value,unit)}</b></span><span>{lane.name.split(" ")[0]} <b>{valueLabel(lane.value,unit)}</b></span></div>
      <Link className="ah-primary" href="/board#duel">Open 1v1 matchups ↗</Link>
      <p className="ah-small">{sampleMode ? "Sample opponent from the app’s existing field model." : "Opponent values follow the app’s current field model, including synthetic peers where used."}</p>
    </> });
  }
  function openProfile() {
    const rating = state.ratings.find(r => r.sport === state.primary);
    const links = state.links.filter(l => l.status === "connected");
    setDetail({ title: state.name, body: <>
      <p className="ah-eyebrow">{state.city} · {sport.name}</p><strong className="ah-sheet-number">{rankForElo(rating?.openElo ?? 1000).name}</strong>
      <div className="ah-stat-row"><div><b>{rating?.openElo ?? 1000}</b><span>Rating</span></div><div><b>{activities.length}</b><span>Moves this week</span></div></div>
      <p>{sampleMode ? "Sample week · no tracker is connected." : links.length ? `${links.map(l=>l.provider).join(", ")} connected.` : "No live tracker connected."}</p>
      <Link href="/you#connections" className="ah-text-link">Manage tracker connections ↗</Link>
      <Link href="/you" className="ah-primary">Full athlete profile ↗</Link>
    </> });
  }
  if (!arrival) return <div className="ah-phone ah-loading">Getting your week ready…</div>;
  return <div className={`ah-phone ah-layout-${layout}`} data-view={view} data-reveal={arrival.reveal && !finished ? "playing" : "settled"}>
    <header className="ah-app-header"><span className="ah-sport-name">{sport.name}</span>{view === "today" && <button className="ah-week-header" aria-label="Open your week’s activities" onClick={openWeek}>{formatVolume(state.primary,snapshot.distanceM,snapshot.movingSec)}</button>}</header>
    {failed && <p className="ah-status">Account data couldn’t load. Showing the device copy; return detection is paused.</p>}
    <main className="ah-app-main">
      {view === "today" ? <HomeConcept layout={layout} activities={activities} sport={state.primary} now={now} periodStart={board.periodStart} recommendation={today} onActivity={openActivity} onCoach={openCoach} /> : view === "progress" || view === "athlete" ? <HomeSecondaryView view={view} state={state} snapshot={snapshot} sampleMode={sampleMode} unsynced={unsynced} onActivity={openActivity} onProfile={openProfile} /> : <section className="ah-arena" aria-label="Weekly progress arena">
        <div className="ah-arena-heading"><h1>Arena</h1><button onClick={() => { setScene(s=>s === "2d" ? "3d" : "2d"); setSceneUnavailable(false); }} aria-label={scene === "2d" ? "Show 3D arena" : "Show 2D arena"}>{scene === "2d" ? "3D" : "2D"}</button></div>
        <div className="ah-arrival-stats"><button onClick={openWeek}><strong>{valueLabel(shownYou,unit)}</strong>{gain && <span>{valueLabel(oldYou,unit)} → {valueLabel(you.value,unit)}</span>}</button>{snapshot.lanes.length > 1 && <div><b>#{currentRank}</b>{gain && oldRank > rank && <span>#{oldRank} → #{rank}</span>}</div>}</div>
        <div className="ah-arena-track">
          {scene === "3d" && !sceneUnavailable ? <Pursuit runners={scenes} ghost={null} time={1 + progress} extra={0} selected={you.id} showGhost={false} camera="follow" look={defaultLook} unit={unit} onSelect={openAthlete} onUnavailable={() => setSceneUnavailable(true)} /> : <>
            {sceneUnavailable && <p className="ah-small">3D isn’t available on this device. Your 2D field is ready.</p>}
            <div className="ah-scale"><span>0 {unit}</span><span>{scale} {unit}</span></div>
            {visibleLanes.map(lane => {
              const old = arrival.previous.lanes.find(l=>l.id===lane.id)?.value ?? lane.value;
              const value = old + (lane.value-old)*progress;
              return <button className={`ah-runner ${lane.you ? "ah-runner-you" : ""}`} key={lane.id} onClick={()=>openAthlete(lane.id)} aria-label={`${lane.you ? "You" : lane.name}, ${valueLabel(value,unit)}. Open details`}>
                <span className="ah-runner-label">{lane.you ? "YOU" : lane.name.split(" ")[0]}</span><span className="ah-runner-lane"><span className="ah-runner-fill" style={{width:`${value/scale*100}%`}} /><span className="ah-runner-dot" style={{left:`${value/scale*100}%`}}>{initialsFromName(lane.name)}</span>{gain && lane.you && <span className="ah-old-position" style={{left:`${oldYou/scale*100}%`}} aria-hidden="true" />}</span><span className="ah-runner-value">{value.toFixed(1)}</span>
              </button>;
            })}
            {snapshot.lanes.length > 3 && <button className="ah-field-expand" onClick={() => setFullField(v => !v)}>{fullField ? "Close contest ↑" : `All ${snapshot.lanes.length} ↓`}</button>}
          </>}
        </div>
        {gain && <div className="ah-arena-verdict" aria-live="polite"><Ace /><b>+{valueLabel(unit === "km" ? gain.distanceM/1000 : gain.effort,unit)}</b><button className="ah-replay" aria-label="Replay your movement" onClick={()=>setReplay(r=>r+1)}>↺</button></div>}
        {gain && <button className="ah-primary ah-continue" onClick={()=>{ saveSeen(snapshot); setView("today"); }}>Today →</button>}
      </section>}
    </main>
    <nav className="ah-dock" aria-label="App views">{(["today","arena","progress","athlete"] as const).map(tab => <button key={tab} aria-pressed={view===tab} onClick={()=>{ if(tab==="today")saveSeen(snapshot); setView(tab); }}><DockIcon view={tab} /><span>{tab[0].toUpperCase()+tab.slice(1)}</span>{tab==="arena" && gain && !finished && <span className="ah-new-dot" />}</button>)}</nav>
    <DetailSheet detail={detail} onClose={()=>setDetail(null)} />
  </div>;
}
