import { useState } from "react";
import {
  checkpoints,
  comparisonScale,
  gapText,
  imports,
  references,
  referenceSegment,
} from "./model";
import { Mascot } from "./mascot";
import type { WorldProps } from "./types";

export function TempoWorld(p: WorldProps) {
  const [side, setSide] = useState<"a" | "b">("a");
  const scale = comparisonScale(p.reference);
  const km = side === "a" ? p.week.total : p.week.against;
  const active = Math.max(0, p.week.cutoff - 1);
  const current = imports[active]!;
  return (
    <main className="world-product tempo-world">
      <header className="tempo-header">
        <a className="tempo-logo" href="#tempo-deck">
          TEMPO<span>GET OUT. GET INTO IT.</span>
        </a>
        <span>PERSONAL MIX / VOL. 42</span>
        <button onClick={p.onGroups}>Friends’ mixes ↗</button>
      </header>
      <section className="tempo-cover">
        <div>
          <p className="world-eyebrow">
            Made from the movement you already did.
          </p>
          <h1>
            Your week.
            <br />
            <em>In three tracks.</em>
          </h1>
          <div className="tempo-side-switch" aria-label="Mixtape side">
            <button aria-pressed={side === "a"} onClick={() => setSide("a")}>
              SIDE A / YOU
            </button>
            <button aria-pressed={side === "b"} onClick={() => setSide("b")}>
              SIDE B / REFERENCE
            </button>
          </div>
          <div className="tempo-cover-number">
            <strong>{km.toFixed(1)}</strong>
            <span>
              km accumulated
              <br />
              {p.week.label} cutoff
            </span>
          </div>
        </div>
        <div className="tempo-album">
          <span className="tempo-album-volume">
            THE EVERYDAY MIX
            <br />
            VOLUME 42
          </span>
          <div className="tempo-album-grid" aria-hidden="true" />
          <Mascot concept="tempo" decorative={false} />
          <span className="tempo-album-title">
            FEEL YOUR
            <br />
            OWN RHYTHM.
          </span>
          <b>THREE OUTINGS / ONE WEEK</b>
        </div>
      </section>
      <section
        id="tempo-deck"
        className="tempo-deck"
        aria-label="Your weekly mixtape comparison"
      >
        <div className="tempo-deck-label">
          <span>NOW IN THE DECK / SIDE {side.toUpperCase()}</span>
          <span>
            {side === "a"
              ? "YOUR CURRENT WEEK"
              : p.reference.name.toUpperCase()}
          </span>
        </div>
        <div className="tempo-tape">
          <div
            className="tempo-reel"
            style={{ transform: `rotate(${km * 18}deg)` }}
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>
          <div className="tempo-tape-window">
            <span>
              {p.week.cutoff === 0
                ? "READY WHEN YOU ARE"
                : current.day.toUpperCase()}
            </span>
            <strong>{gapText(p.week.gap)}</strong>
            <small>
              {p.reference.ghost ? "Your previous week" : p.reference.name} /
              same cutoff
            </small>
            <div className="tempo-tape-distance">
              <span style={{ width: `${(km / scale) * 100}%` }} />
            </div>
            <span className="tempo-tape-scale">
              0 — {scale} KM / DISTANCE RIBBON
            </span>
          </div>
          <div
            className="tempo-reel"
            style={{ transform: `rotate(${km * -18}deg)` }}
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="tempo-transport">
          <button
            onClick={() => p.onCutoff(Math.max(0, p.week.cutoff - 1))}
            disabled={p.week.cutoff === 0}
            aria-label="Previous mixtape track"
          >
            ↤
          </button>
          <button className="tempo-play" onClick={p.onReplay}>
            {p.playing ? "Ⅱ PAUSE MIX" : "▶ REPLAY MIX"}
          </button>
          <button
            onClick={() => p.onCutoff(Math.min(3, p.week.cutoff + 1))}
            disabled={p.week.cutoff === 3}
            aria-label="Next mixtape track"
          >
            ↦
          </button>
          <button onClick={() => setSide(side === "a" ? "b" : "a")}>
            FLIP TAPE ↻
          </button>
        </div>
      </section>
      <section className="tempo-tracklist">
        <header>
          <div>
            <p className="world-eyebrow">THE TRACKLIST</p>
            <h2>All your own work.</h2>
          </div>
          <label>
            Reference
            <select
              aria-label="Mixtape comparison"
              value={p.reference.id}
              onChange={(e) => p.onReference(e.target.value)}
            >
              {references.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </header>
        <div className="tempo-track-head">
          <span>TRACK / DATE</span>
          <span>DISTANCE ADDED</span>
        </div>
        {imports.map((a, i) => (
          <div
            className={`tempo-track ${p.week.cutoff === i + 1 ? "is-current" : ""}`}
            key={a.id}
          >
            <button
              className="tempo-track-select"
              aria-pressed={p.week.cutoff === i + 1}
              onClick={() => p.onCutoff(i + 1)}
            >
              <span className="tempo-track-index">0{i + 1}</span>
              <div>
                <strong>
                  {side === "a" ? a.title : `${a.day} / reference`}
                </strong>
                <small>
                  {a.day}{" "}
                  {side === "a" ? `· ${a.minutes} min` : "· comparison segment"}
                </small>
                <div className="tempo-track-bars" aria-hidden="true">
                  <span style={{ width: `${(a.km / 10) * 100}%` }} />
                  <span
                    style={{
                      width: `${(referenceSegment(p.reference, i) / 10) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <b>
                {(side === "a"
                  ? a.km
                  : referenceSegment(p.reference, i)
                ).toFixed(1)}
                <small>km</small>
              </b>
            </button>
            <button
              className="tempo-track-receipt"
              onClick={() => p.onActivity(a)}
              aria-label={`Open ${a.title} activity receipt`}
            >
              ↗
            </button>
          </div>
        ))}
        <div className="tempo-track-legend">
          <span>▬ Your distance</span>
          <span>▬ Reference distance</span>
          <small>Each track uses the same 0–10 km scale</small>
        </div>
      </section>
      <div className="tempo-cutoff-picker" aria-label="Mixtape cutoff">
        {checkpoints.map((label, i) => (
          <button
            key={label}
            onClick={() => p.onCutoff(i)}
            aria-pressed={p.week.cutoff === i}
          >
            {label}
          </button>
        ))}
      </div>
      <footer className="tempo-footer">
        <Mascot concept="tempo" />
        <div>
          <strong>
            A GOOD WEEK.
            <br />
            WORTH ANOTHER SPIN.
          </strong>
          <p>Bop keeps the rhythm. You make the mix.</p>
        </div>
        <span>
          VISUAL MIXTAPE
          <br />
          RECORDED MILESTONES
        </span>
      </footer>
    </main>
  );
}
