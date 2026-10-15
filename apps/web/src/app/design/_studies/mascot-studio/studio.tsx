"use client";

import { useState } from "react";
import { EMBER_ACTIONS, EMBER_CLIPS, EMBER_EXPRESSIONS, EMBER_MODEL, EMBER_REST, exportEmberSvg, normalizeEmberPose, sampleEmber, type EmberAction, type EmberExpression, type EmberPose } from "@fitness-battle/shared/mascot";
import { Ember } from "@/components/mascot/ember";
import { useEmberPlayback } from "@/components/mascot/use-ember-playback";
import styles from "./studio.module.css";

const actionDetails: Record<EmberAction, { title: string; caption: string; sample: number }> = {
  idle: { title: "Breathe", caption: "Easy does it", sample: 0.3 },
  wave: { title: "Say hello", caption: "A little welcome", sample: 0.47 },
  hop: { title: "Hop", caption: "Find your lift", sample: 0.49 },
  run: { title: "Run", caption: "Keep it moving", sample: 0.2 },
  celebrate: { title: "Celebrate", caption: "You earned this", sample: 0.32 },
  dash: { title: "Dash", caption: "Make your move", sample: 0.4 },
};
const expressions: Record<EmberExpression, string> = { smile: "Smile", happy: "Happy", wink: "Wink", joy: "Joy", surprised: "Surprised", focused: "Focused" };
const motionPoses = Object.fromEntries(EMBER_ACTIONS.map(action => [action, sampleEmber(action, EMBER_CLIPS[action].duration * actionDetails[action].sample)])) as Record<EmberAction, EmberPose>;

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function MascotStudio() {
  const [action, setAction] = useState<EmberAction>("idle");
  const [playing, setPlaying] = useState(true);
  const [loop, setLoop] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [restartKey, setRestartKey] = useState(0);
  const [expression, setExpression] = useState<EmberExpression | "auto">("auto");
  const [overrides, setOverrides] = useState<Partial<EmberPose>>({});
  const [shadow, setShadow] = useState(true);
  const [message, setMessage] = useState("");
  const [previewMotion, setPreviewMotion] = useState(false);
  const playback = useEmberPlayback({ action, playing, loop, speed, restartKey, motionOverride: previewMotion });
  const pose = normalizeEmberPose({ ...playback.pose, ...overrides });
  const selectedExpression = expression === "auto" ? undefined : expression;
  const duration = EMBER_CLIPS[action].duration;
  const isPlaying = playing && (loop || playback.time < duration);
  const chooseAction = (next: EmberAction) => { setAction(next); setOverrides({}); setPlaying(true); setRestartKey(value => value + 1); };
  const reset = () => { setOverrides({}); setExpression("auto"); setShadow(true); };

  const control = (label: string, key: keyof EmberPose, min = -1, max = 1) => <label className={styles.slider} key={key}>
    <span>{label}<output aria-live="off">{(overrides[key] ?? 0).toFixed(2)}</output></span>
    <input aria-label={label} type="range" min={min} max={max} step="0.01" value={overrides[key] ?? 0} onChange={event => { setPlaying(false); setOverrides(value => ({ ...value, [key]: Number(event.target.value) })); }} />
  </label>;

  return <main className={styles.studio}>
    <header className={styles.header}>
      <a href="/design" className={styles.brand}><span className={styles.brandIcon}>✳</span> FITNESS BATTLE <span className={styles.divider}>/</span> <span className={styles.brandSub}>CHARACTER STUDIO</span></a>
      <span className={styles.version}><span /> MODEL 01 <span className={styles.versionSep}>·</span> VECTOR RIG</span>
    </header>

    <section className={styles.intro}>
      <div><p className={styles.eyebrow}>A LITTLE FIRE. A LOT OF CHARACTER.</p><h1>Meet <span>Ember.</span></h1></div>
      <p>One little spark, ready for anything.<br />The same character in every expression,<br className={styles.desktopBreak} /> every stretch, every small victory.</p>
    </section>

    <div className={styles.workspace}>
      <section className={styles.preview} aria-label="Mascot preview and playback">
        <div className={styles.stage} ref={playback.hostRef}>
          <div className={styles.stageTop}><span><i /> LIVE CHARACTER</span><span>STAR EMBER / V{EMBER_MODEL.version}</span></div>
          <div className={styles.character}><Ember pose={pose} expression={selectedExpression} shadow={shadow} label="Star Ember, a golden star with a curved flame tip" /></div>
          <div className={styles.stageBottom}><span className={styles.motionName}>{actionDetails[action].title}<small>{EMBER_CLIPS[action].description}</small></span><span className={styles.dimension}>2D <span>+</span> DEPTH</span></div>
        </div>
        <div className={styles.transport}>
          <button className={styles.play} onClick={() => { if (!loop && playback.time >= duration) { setRestartKey(value => value + 1); setPlaying(true); } else setPlaying(value => !value); }} disabled={playback.reducedMotion} aria-label={isPlaying ? "Pause animation" : "Play animation"}>{isPlaying ? "Ⅱ" : "▶"}</button>
          <button className={styles.replay} onClick={() => { setRestartKey(value => value + 1); setPlaying(true); }} disabled={playback.reducedMotion} aria-label="Replay animation">↻</button>
          <label className={styles.scrubber}><span className={styles.srOnly}>Animation time</span><input type="range" min="0" max={duration} step="1" value={playback.time} disabled={playback.reducedMotion} onChange={event => { setPlaying(false); playback.seek(Number(event.target.value)); }} /></label>
          <output aria-live="off" className={styles.timestamp}>{(playback.time / 1000).toFixed(1)} / {(duration / 1000).toFixed(1)}s</output>
          <label className={styles.speed}><span className={styles.srOnly}>Playback speed</span><select value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1">1×</option></select></label>
          <label className={styles.loop}><input type="checkbox" checked={loop} onChange={event => setLoop(event.target.checked)} />Loop</label>
        </div>
        {playback.systemReducedMotion && <p className={styles.reduced} role="status">{previewMotion ? "Motion preview is enabled for this studio." : "Reduced motion is enabled. Ember holds still; expression and pose controls remain available."} <button onClick={() => setPreviewMotion(value => !value)}>{previewMotion ? "Respect reduced motion" : "Preview motion anyway"}</button></p>}
      </section>

      <aside className={styles.inspector} aria-label="Character controls">
        <div className={styles.panelHeading}><span className={styles.eyebrow}>MAKE IT YOUR MOMENT</span><span className={styles.panelNumber}>01—06</span></div>
        <h2>A familiar face.</h2><p className={styles.panelHint}>Change the feeling. Keep the character.</p>
        <div className={styles.expressions}>{EMBER_EXPRESSIONS.map(item => <button key={item} className={expression === item ? styles.expressionSelected : ""} aria-pressed={expression === item} onClick={() => setExpression(item)}><Ember expression={item} shadow={false} />{expressions[item]}</button>)}</div>
        <button className={styles.autoFace} aria-pressed={expression === "auto"} onClick={() => setExpression("auto")}>{expression === "auto" ? "●" : "○"} Let the animation choose the expression</button>
        <div className={styles.rigHeading}><h3>Shape & pose</h3><button onClick={reset}>Reset</button></div>
        <p className={styles.rigHint}>Move a control to hold and adjust a pose.</p>
        {control("Turn · simulated depth", "yaw")}
        {control("Flame bend", "crest")}
        <div className={styles.controlPair}>{control("Left point", "armLeft")}{control("Right point", "armRight")}</div>
        <div className={styles.controlPair}>{control("Left foot", "legLeft")}{control("Right foot", "legRight")}</div>
        <label className={styles.shadowToggle}><input type="checkbox" checked={shadow} onChange={event => setShadow(event.target.checked)} />Ground shadow<span>Transparent artwork</span></label>
      </aside>
    </div>

    <section className={styles.motionSection} aria-label="Motion library">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>ONE CHARACTER. EVERY MOVE.</p><h2>A spark of personality.</h2></div><span>06 MOTION STUDIES <span className={styles.arrow}>↙</span></span></div>
      <div className={styles.motionGrid}>{EMBER_ACTIONS.map((item, index) => <button className={`${styles.motionCard} ${item === action ? styles.motionSelected : ""}`} key={item} aria-pressed={item === action} onClick={() => chooseAction(item)}>
        <div className={styles.cardTop}><span>0{index + 1}</span><span>{item === action ? "↗" : "+"}</span></div>
        <Ember pose={motionPoses[item]} />
        <strong>{actionDetails[item].title}</strong><small>{actionDetails[item].caption}</small>
      </button>)}</div>
    </section>

    <section className={styles.handoff}>
      <div><span className={styles.eyebrow}>BUILT TO STAY ITSELF</span><h2>One model. Anywhere Ember goes.</h2><p>Shared curves, colors and motion. Rendered as vectors on web and mobile.</p></div>
      <div className={styles.exports}>
        <button className={styles.exportPrimary} onClick={() => { download(`ember-${action}.svg`, exportEmberSvg({ pose, expression: selectedExpression, shadow }), "image/svg+xml"); setMessage("Current pose exported as a transparent SVG."); }}>Export pose <span>↗</span></button>
        <button onClick={() => { download("star-ember-model-v1.json", JSON.stringify({ model: EMBER_MODEL, rest: EMBER_REST, clips: EMBER_CLIPS, preview: { action, timeMs: playback.time, expression, pose, shadow } }, null, 2), "application/json"); setMessage("Model, motion keyframes and current pose exported as JSON."); }}>Model JSON <span>↓</span></button>
      </div>
    </section>
    <p className={styles.status} role="status">{message}</p>
    <footer className={styles.footer}><span>STAR EMBER <b>✳</b> FITNESS BATTLE</span><span>A connected vector rig · Designed for movement</span></footer>
  </main>;
}
