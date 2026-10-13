import { useState } from "react";
import { distanceFor } from "../evolution-lab/model";
import { checkpoints, gapText, imports, references } from "./model";
import { Mascot } from "./mascot";
import type { WorldProps } from "./types";

const captions = [
  "The week begins.",
  "A good opening move.",
  "The plot picks up.",
  "A little fresh air. A new chapter.",
];
export function FlipWorld(p: WorldProps) {
  const [parallel, setParallel] = useState(false);
  const current = imports[Math.max(0, p.week.cutoff - 1)]!;
  return (
    <main className="world-product flip-world">
      <header className="flip-masthead">
        <a href="#flip-story" className="flip-logo">
          FLIP<span>THE MOVEMENT COMIC</span>
        </a>
        <div>
          YOUR WEEKLY ISSUE
          <br />
          <b>No. 42 / Oct 12–19</b>
        </div>
        <button onClick={p.onGroups}>Guest stars ↗</button>
      </header>
      <section className="flip-cover">
        <div>
          <p className="world-eyebrow">Starring you. Powered by getting out.</p>
          <h1>
            Your week.
            <br />
            <em>Quite a story.</em>
          </h1>
          <p>
            Every outing adds a frame.
            <br />
            Here’s what your three moves made.
          </p>
        </div>
        <div className="flip-cover-art">
          <span className="flip-burst">
            KEEP
            <br />
            IT MOVING!
          </span>
          <Mascot concept="flip" decorative={false} />
          <span className="flip-cover-caption">
            ZIP / YOUR RUNNING COMMENTARY
          </span>
        </div>
      </section>
      <section
        id="flip-story"
        className="flip-story"
        aria-label="Your weekly comic"
      >
        <div className="flip-page-tools">
          <span>YOUR WEEK / {p.week.label.toUpperCase()}</span>
          <div>
            <button
              onClick={() => p.onCutoff(Math.max(0, p.week.cutoff - 1))}
              disabled={p.week.cutoff === 0}
              aria-label="Previous comic panel"
            >
              ←
            </button>
            <button
              onClick={() => p.onCutoff(Math.min(3, p.week.cutoff + 1))}
              disabled={p.week.cutoff === 3}
              aria-label="Next comic panel"
            >
              →
            </button>
          </div>
        </div>
        <div className="flip-panels">
          <article className="flip-feature-panel" data-cutoff={p.week.cutoff}>
            <span className="flip-panel-date">
              {p.week.cutoff === 0
                ? "MONDAY / 00:00 UTC"
                : `${current.day.toUpperCase()} / ${current.date}`}
            </span>
            <div className="flip-panel-sky" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <Mascot concept="flip" className="flip-panel-character" />
            <div className="flip-speech">{captions[p.week.cutoff]}</div>
            <div className="flip-action-word">
              {p.week.cutoff === 0
                ? "READY!"
                : p.week.cutoff === 1
                  ? "GO!"
                  : p.week.cutoff === 2
                    ? "WHOOSH!"
                    : "NICE!"}
            </div>
            <button
              className="flip-panel-receipt"
              onClick={() => p.onActivity(current)}
              disabled={p.week.cutoff === 0}
            >
              {p.week.cutoff === 0
                ? "Nothing counted yet"
                : `${current.title} · +${current.km} km ↗`}
            </button>
          </article>
          <div className="flip-side-panels">
            <article className="flip-total-panel">
              <span>THE STORY SO FAR</span>
              <strong>{p.week.total.toFixed(1)}</strong>
              <b>KILOMETRES</b>
              <p>
                {p.week.count} counted{" "}
                {p.week.count === 1 ? "outing" : "outings"}
              </p>
            </article>
            <article className="flip-gap-panel">
              <span>THE TWIST</span>
              <strong>{gapText(p.week.gap)}</strong>
              <p>
                {p.reference.ghost
                  ? "of your previous week"
                  : `compared with ${p.reference.name.split(" ")[0]}`}
                <br />
                at the same cutoff.
              </p>
              <button
                onClick={() => setParallel(!parallel)}
                aria-expanded={parallel}
              >
                {parallel
                  ? "Close the parallel story"
                  : "Read the parallel story"}{" "}
                ↗
              </button>
            </article>
          </div>
        </div>
        <div className="flip-chapters" aria-label="Comic chapters">
          {checkpoints.map((label, i) => (
            <button
              key={label}
              onClick={() => p.onCutoff(i)}
              aria-pressed={p.week.cutoff === i}
            >
              <span>{i === 0 ? "PROLOGUE" : `FRAME ${i}`}</span>
              <strong>{label}</strong>
              <small>
                {i === 0 ? "0.0" : [5.9, 13, 19.2][i - 1]!.toFixed(1)} km
              </small>
            </button>
          ))}
        </div>
      </section>
      {parallel && (
        <section
          className="flip-parallel"
          aria-label="Parallel comparison story"
        >
          <header>
            <h2>Same week. Another storyline.</h2>
            <label>
              Read beside
              <select
                aria-label="Comic comparison"
                value={p.reference.id}
                onChange={(e) => p.onReference(e.target.value)}
              >
                {references.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.ghost ? "Your previous week" : r.name}
                  </option>
                ))}
              </select>
            </label>
          </header>
          <div className="flip-parallel-frames">
            {imports.map((a, i) => (
              <button
                key={a.id}
                onClick={() => p.onCutoff(i + 1)}
                aria-pressed={p.week.cutoff === i + 1}
              >
                <span>{a.day}</span>
                <strong>
                  {[5.9, 13, 19.2][i]!.toFixed(1)}
                  <small>km / you</small>
                </strong>
                <b>
                  {distanceFor(p.reference, i + 1).toFixed(1)}
                  <small>
                    km /{" "}
                    {p.reference.ghost
                      ? "previous"
                      : p.reference.name.split(" ")[0]}
                  </small>
                </b>
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="flip-credits">
        <h2>
          Three moves.
          <br /> All part of the plot.
        </h2>
        <div>
          {imports.map((a, i) => (
            <button key={a.id} onClick={() => p.onActivity(a)}>
              <span>0{i + 1}</span>
              <div>
                <strong>{a.title}</strong>
                <small>
                  {a.day} · {a.minutes} min
                </small>
              </div>
              <b>+{a.km} km ↗</b>
            </button>
          ))}
        </div>
      </section>
      <footer className="flip-footer">
        <strong>TO BE CONTINUED…</strong>
        <span>Life happens. The next frame will find you.</span>
        <button onClick={p.onReplay}>
          {p.playing ? "Pause the story" : "Replay the four chapters"} ↻
        </button>
      </footer>
    </main>
  );
}
