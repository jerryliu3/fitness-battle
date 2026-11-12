"use client";

import { useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { RANK_SYMBOL_GEOMETRY, rankSymbolForRankName, type AthleteCardModel } from "@fitness-battle/shared";
import { cardOptics, REST_POSE } from "./card-optics";
import { useCardRotation } from "./use-card-rotation";
import styles from "./athlete-crest.module.css";

const WIDTH = 320, HEIGHT = 368;
const { size: WREATH, portrait: APERTURE } = RANK_SYMBOL_GEOMETRY;
const WREATH_FRAME = {
  width: `${(WREATH / APERTURE.size) * 100}%`,
  height: `${(WREATH / APERTURE.size) * 100}%`,
  left: `${(-APERTURE.x / APERTURE.size) * 100}%`,
  top: `${(-APERTURE.y / APERTURE.size) * 100}%`,
};
const POINTS = [[24, 0], [296, 0], [320, 28], [320, 244], [300, 298], [160, 368], [20, 298], [0, 244], [0, 28]];
const CLIP = `polygon(${POINTS.map(([x, y]) => `${x / WIDTH * 100}% ${y / HEIGHT * 100}%`).join(",")})`;
function Wordmark() { return <span className={styles.wordmark}>overtaek↗</span>; }
function Stat({ value, label, dim = false }: { value: string | number; label: string; dim?: boolean }) {
  return <div className={styles.stat} data-dim={dim}><strong>{value}</strong><span>{label}</span></div>;
}
function RecordDate({ date }: { date: string }) {
  return <time dateTime={date}>{new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" })}</time>;
}

/** The selected Crest composition, with Goalmaxxing's actual alloy optics. */
export function AthleteCrest({ model, active = true }: { model: AthleteCardModel; active?: boolean }) {
  const still = Boolean(useReducedMotion()) || !active;
  const rotation = useCardRotation(still);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const details = rotation.backVisible;
  const photo = model.avatarUrl && model.avatarUrl !== failedPhoto;
  return <section className={styles.crest} aria-label="Athlete card" data-still={still}>
    <div ref={rotation.stage} className={styles.stage} style={cardOptics(REST_POSE) as CSSProperties} {...rotation.stageHandlers}>
      <div className={styles.shadow} aria-hidden="true" />
      <div className={styles.object} style={{ "--clip": CLIP, aspectRatio: `${WIDTH} / ${HEIGHT}` } as CSSProperties} tabIndex={0} role="group" aria-label={`${model.name} athlete card`} {...rotation.cardHandlers}>
        <div className={styles.body} aria-hidden="true">{POINTS.map(([x, y], i) => {
          const [nx, ny] = POINTS[(i + 1) % POINTS.length];
          const angle = Math.atan2(ny - y, nx - x);
          return <span key={i} className={styles.edge} style={{ left: `${x / WIDTH * 100}%`, top: `${y / HEIGHT * 100}%`, width: `${(Math.hypot(nx - x, ny - y) / WIDTH * 100 + .08).toFixed(6)}cqi`, "--turn": `${(angle * 180 / Math.PI).toFixed(6)}deg`, "--nx": Math.sin(angle).toFixed(6), "--ny": (-Math.cos(angle)).toFixed(6) } as CSSProperties} />;
        })}</div>
        <div className={`${styles.face} ${styles.front}`} aria-hidden={details} inert={details}>
          <svg className={styles.track} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} fill="none" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map(i => <rect key={i} x={-114 - i * 15} y={96 - i * 15} width={385 + i * 30} height={460 + i * 30} rx={155 + i * 15} stroke="currentColor" transform="rotate(-28 160 224)" />)}</svg>
          <div className={styles.rating}><strong>{model.score === null ? "—" : model.score.toLocaleString("en-US")}</strong><span>Effort Score</span></div>
          <div className={styles.sport}><strong>{model.sport}</strong><span>Primary sport</span></div>
          <div className={styles.portrait}>{photo ? <img className={styles.photo} src={model.avatarUrl!} alt="" draggable={false} onError={() => setFailedPhoto(model.avatarUrl)} /> : <span aria-hidden="true">{model.initials}</span>}
            <img className={styles.wreath} src={`/rank-symbols/${rankSymbolForRankName(model.rank)}.png`} alt="" draggable={false} style={WREATH_FRAME} />
          </div>
          <div className={styles.identity} data-long-name={model.name.length > 18}><h2 title={model.name}>{model.name}</h2></div>
          <div className={styles.stats}>
            {model.records.length ? <div className={styles.records} style={{ gridTemplateColumns: `repeat(${Math.min(3, model.records.length)}, 1fr)` }}>{model.records.slice(0, 3).map(r => <Stat key={r.label} value={r.value} label={`${r.label} PB`} />)}</div> : <p className={styles.noRecords}>No personal bests yet</p>}
            <div className={styles.totals}><Stat value={model.overtakes} label="Overtakes" /><Stat value={model.rounds} label="Rounds" /><Stat value={model.streak} label="Week streak" dim={!model.streakActive} /></div>
          </div>
          <div className={styles.brand}><Wordmark /></div>
        </div>
        <div className={`${styles.face} ${styles.back}`} aria-hidden={!details} inert={!details}>
          <div className={styles.reverse}><Wordmark /><h2 title={model.name}>{model.name}</h2><p>{model.sport} · Primary sport</p>
            <h3>Personal bests</h3>{model.records.length ? <dl>{model.records.map(r => <div key={r.label}><dt>{r.label}<RecordDate date={r.date} /></dt><dd>{r.value}</dd></div>)}</dl> : <p>No personal bests yet</p>}
            <h3>On Overtaek</h3><div className={styles.totals}><Stat value={model.overtakes} label="Overtakes" /><Stat value={model.rounds} label="Rounds" /><Stat value={model.streak} label="Week streak" dim={!model.streakActive} /></div>
          </div>
        </div>
      </div>
    </div>
  </section>;
}
