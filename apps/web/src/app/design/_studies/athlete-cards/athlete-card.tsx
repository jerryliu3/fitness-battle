"use client";

import { useId, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { ATHLETE as a, CONCEPTS, DEFAULT_PHOTO, cardOutline, type CardPhoto, type ConceptId } from "./catalog";
import { cardOptics, REST_POSE } from "@/features/athlete-card/card-optics";
import { useCardRotation } from "@/features/athlete-card/use-card-rotation";
import styles from "./athlete-cards.module.css";

function Wordmark() { return <span className={styles.wordmark}>overtaek<span>↗</span></span>; }
function Portrait({ className = "" }: { className?: string }) {
  // A study-owned cutout; production would use the athlete's chosen profile photo.
  return <img className={`${styles.portrait} ${className}`} src="/design/athlete-cards/runner.png" alt="" draggable={false} />;
}
function Metric({ value, label }: { value: string; label: string }) {
  return <div className={styles.metric}><strong>{value}</strong><span>{label}</span></div>;
}
function TrackArt() {
  return <svg className={styles.trackArt} viewBox="0 0 320 448" fill="none" aria-hidden="true">
    {[0, 1, 2, 3, 4, 5].map(i => <rect key={i} x={-114 - i * 15} y={96 - i * 15} width={385 + i * 30} height={460 + i * 30} rx={155 + i * 15} stroke="currentColor" strokeWidth="1" transform="rotate(-28 160 224)" />)}
  </svg>;
}
function Percentile({ compact = false }: { compact?: boolean }) {
  return <div className={`${styles.percentile} ${compact ? styles.compactPercentile : ""}`}><strong>{a.percentile}</strong><span>{compact ? "PCTL" : <>RUNNING<br />PERCENTILE</>}</span></div>;
}

function PhotoFrame({ photo, className }: { photo: CardPhoto; className: string }) {
  return <div className={`${styles.cropFrame} ${className}`} data-photo-kind={photo.kind}>
    {photo.kind === "none" ? <span aria-hidden="true" className={styles.monogram}>MC</span> : <img className={styles.cropImage} src={photo.src} alt="" draggable={false} style={{ objectPosition: photo.kind === "cutout" ? "50% 100%" : `${photo.x}% ${photo.y}%` }} />}
  </div>;
}
function ShieldIdentity() {
  return <div className={styles.shieldIdentity}><span>{a.city}</span><h2>{a.name}</h2><span>OPEN EFFORT SCORE <b>{a.effort}</b></span></div>;
}
function ShieldStats() {
  return <div className={styles.shieldStats}>
    <Metric value={a.records[0].value} label="5K best" /><Metric value={a.records[1].value} label="10K best" /><Metric value={a.records[2].value} label="Half best" />
    <Metric value={a.overtakes} label="Overtakes" /><Metric value={a.weeks} label="Active weeks" /><Metric value={a.streak} label="Week streak" />
  </div>;
}
function ClubStats() {
  return <div className={styles.clubStats}><Metric value={a.effort} label="Effort Score" /><Metric value={a.weeks} label="Active weeks" /><Metric value={a.overtakes} label="Overtakes" /></div>;
}
function ShieldWindow({ photo }: { photo: CardPhoto }) {
  return <>
    <TrackArt />
    <div className={styles.windowHeader}><Wordmark /><span><b>{a.percentile}</b> RUNNING PCTL</span></div>
    <PhotoFrame photo={photo} className={styles.windowPhoto} />
    <ShieldIdentity /><ShieldStats />
    <div className={styles.shieldBrand}>RUNNING · OPEN</div>
  </>;
}
function ShieldCrest({ photo }: { photo: CardPhoto }) {
  return <>
    <TrackArt />
    <div className={styles.shieldTop}><Percentile /><span className={styles.cardSport}>RUN<br /><span>OPEN</span></span></div>
    <PhotoFrame photo={photo} className={styles.crestPhoto} />
    <ShieldIdentity /><ShieldStats />
    <div className={styles.shieldBrand}><Wordmark /></div>
  </>;
}
function ClubPhoto({ photo, split = false }: { photo: CardPhoto; split?: boolean }) {
  return <>
    <TrackArt />
    <PhotoFrame photo={photo} className={split ? styles.splitPhoto : styles.insetPhoto} />
    <div className={styles.clubHeader}><Wordmark /><span>{a.percentile}nd · RUNNING PCTL</span></div>
    <div className={styles.cropClubIdentity}><span>RUNNING · OPEN</span><h2>{a.name}</h2><p>{a.city}</p></div>
    <ClubStats />
    <div className={styles.clubFooter}><span>MEMBER SINCE {a.since}</span><span>↗</span></div>
  </>;
}
function ClubSplit({ photo }: { photo: CardPhoto }) { return <ClubPhoto photo={photo} split />; }

function Contender() {
  return <>
    <TrackArt />
    <div className={styles.shieldTop}><Percentile /><span className={styles.cardSport}>RUN<br /><span>OPEN</span></span></div>
    <span className={styles.verticalMark}>THE EVERYDAY ATHLETE</span>
    <div className={styles.shieldPortrait}><Portrait /></div>
    <ShieldIdentity /><ShieldStats />
    <div className={styles.shieldBrand}><Wordmark /></div>
  </>;
}
function PhotoFinish() {
  return <>
    <div className={styles.photoHeader}><Wordmark /><span>ATHLETE / {a.since}</span></div>
    <div className={styles.photoWindow}><TrackArt /><span className={styles.bigRunning}>RUN<br />NING.</span><Portrait /><span className={styles.photoNumber}>{a.percentile}<span>RUNNING PCTL</span></span></div>
    <div className={styles.photoIdentity}><span>{a.city}</span><h2>{a.name}</h2></div>
    <div className={styles.photoStats}><Metric value={a.records[0].value} label="5K best" /><Metric value={a.records[1].value} label="10K best" /><Metric value={a.overtakes} label="Overtakes" /></div>
    <div className={styles.photoFooter}><span>RUNNING · OPEN</span><span>EFFORT {a.effort}</span></div>
  </>;
}
function ClubIssue() {
  return <>
    <TrackArt />
    <div className={styles.clubHeader}><Wordmark /><span>ATHLETE CREDENTIAL</span></div>
    <div className={styles.clubIdentity}><div className={styles.clubPortrait}><Portrait /></div><div><span>RUNNING · OPEN</span><h2>{a.name}</h2><p>{a.city}</p></div><Percentile compact /></div>
    <ClubStats />
    <div className={styles.clubFooter}><span>MEMBER SINCE {a.since}</span><span>EVERYDAY CLUB ↗</span></div>
  </>;
}
function Telemetry() {
  return <>
    <div className={styles.telemetryHeader}><Wordmark /><span>RUN / OPEN</span></div>
    <div className={styles.telemetryIdentity}><div className={styles.smallPortrait}><Portrait /></div><div><h2>{a.name}</h2><span>{a.city}</span></div></div>
    <div className={styles.instrument}>
      <svg viewBox="0 0 240 240" fill="none" aria-hidden="true">
        <circle cx="120" cy="120" r="108" stroke="currentColor" strokeWidth="1" opacity=".2" />
        <circle cx="120" cy="120" r="98" stroke="currentColor" strokeWidth="9" strokeDasharray="1 8.62" opacity=".35" />
        <circle cx="120" cy="120" r="108" stroke="var(--app-action-primary)" strokeWidth="2" strokeDasharray={`${a.percentile} 100`} pathLength="100" transform="rotate(-90 120 120)" />
        <path d="M120 17v12M120 211v12M17 120h12M211 120h12" stroke="currentColor" />
      </svg>
      <div><span>OPEN EFFORT SCORE</span><strong>{a.effort}</strong><span className={styles.instrumentPercentile}>{a.percentile}<sup>nd</sup> <span>RUNNING PERCENTILE</span></span></div>
    </div>
    <div className={styles.telemetryStats}><Metric value={a.records[0].value} label="5K best" /><Metric value={a.streak} label="Week streak" /><Metric value={a.overtakes} label="Overtakes" /></div>
    <div className={styles.telemetryFooter}><span>TRAIN. RETURN. REPEAT.</span><span>{a.since} ↗</span></div>
  </>;
}

function Reverse() {
  return <div className={styles.reverseContent}>
    <header><Wordmark /><span>ATHLETE RECORD</span></header>
    <h2>{a.name}</h2>
    <div className={styles.reverseSummary}><span>RUNNING · OPEN</span><strong>{a.effort} <span>Effort Score</span></strong></div>
    <h3>Personal bests</h3>
    <dl className={styles.records}>{a.records.map(record => <div key={record.label}><dt>{record.label}<span>{record.date}</span></dt><dd>{record.value}</dd></div>)}</dl>
    <h3>On Overtaek <span>ALL TIME</span></h3>
    <div className={styles.reverseStats}><Metric value={a.overtakes} label="Overtakes" /><Metric value={a.weeks} label="Active weeks" /><Metric value={a.streak} label="Week streak" /></div>
    <footer><span>Running percentile</span><strong>{a.percentile}nd <span>· All Open runners</span></strong></footer>
  </div>;
}

export function AthleteCard({ concept, compact = false, photo = DEFAULT_PHOTO }: { concept: ConceptId; compact?: boolean; photo?: CardPhoto }) {
  const reduced = Boolean(useReducedMotion());
  const rotation = useCardRotation(reduced);
  const hintId = useId();
  const outline = cardOutline(concept);
  const definition = CONCEPTS.find(c => c.id === concept)!;
  const family = "family" in definition ? definition.family : definition.id;
  const Front = { contender: Contender, photo: PhotoFinish, club: ClubIssue, telemetry: Telemetry, "shield-window": ShieldWindow, "shield-crest": ShieldCrest, "club-portrait": ClubPhoto, "club-panel": ClubSplit }[concept];
  return <div className={styles.cardPresentation} data-concept={family} data-variant={concept} data-compact={compact}>
    <div ref={rotation.stage} className={styles.stage} style={cardOptics(REST_POSE) as CSSProperties} {...rotation.stageHandlers}>
      <div className={styles.groundShadow} aria-hidden="true" />
      <div className={styles.object} role="group" tabIndex={0} aria-label={`${a.name} athlete card`} aria-describedby={hintId} style={{ "--card-clip": outline.clip, aspectRatio: `${outline.width} / ${outline.height}` } as CSSProperties} {...rotation.cardHandlers}>
        <div className={styles.solid} aria-hidden="true">{outline.points.map(([x, y], i) => {
          const [nextX, nextY] = outline.points[(i + 1) % outline.points.length];
          const angle = Math.atan2(nextY - y, nextX - x);
          return <span className={styles.edge} key={i} style={{ left: `${x / outline.width * 100}%`, top: `${y / outline.height * 100}%`, width: `${(Math.hypot(nextX - x, nextY - y) / outline.width * 100 + .08).toFixed(6)}cqi`, "--edge-angle": `${(angle * 180 / Math.PI).toFixed(6)}deg`, "--nx": Math.sin(angle).toFixed(6), "--ny": (-Math.cos(angle)).toFixed(6) } as CSSProperties} />;
        })}</div>
        <div className={`${styles.face} ${styles.front}`} inert={rotation.backVisible} aria-hidden={rotation.backVisible}><Front photo={photo} /><span className={styles.glaze} aria-hidden="true" /></div>
        <div className={`${styles.face} ${styles.back}`} inert={!rotation.backVisible} aria-hidden={!rotation.backVisible}><Reverse /><span className={styles.glaze} aria-hidden="true" /></div>
      </div>
    </div>
    <div className={styles.cardControls}><button type="button" onClick={rotation.flip}>↻ <span>{rotation.backVisible ? "Show front" : "Turn over"}</span></button><button type="button" onClick={rotation.reset}>Reset</button></div>
    <p className={styles.gestureHint} id={hintId}>{reduced ? "Enter turns over · Home resets" : "Drag to turn · Arrow keys rotate · Enter flips"}</p>
  </div>;
}
