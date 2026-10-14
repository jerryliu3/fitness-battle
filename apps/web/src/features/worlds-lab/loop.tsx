import { useRef } from "react";
import { distanceFor, you } from "../evolution-lab/model";
import {
  checkpoints,
  comparisonScale,
  gapText,
  imports,
  orbitArc,
  orbitPoint,
  references,
} from "./model";
import { Mascot } from "./mascot";
import type { WorldProps } from "./types";

export function LoopWorld(p: WorldProps) {
  const scale = comparisonScale(p.reference);
  const dot = orbitPoint(p.week.total, scale, 164);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const current = imports[Math.max(0, p.week.cutoff - 1)]!;
  return (
    <main className="world-product loop-world">
      <header className="loop-header">
        <a className="loop-logo" href="#loop-object">
          loop<span>MOVEMENT, TAKING SHAPE.</span>
        </a>
        <button onClick={p.onGroups}>Your circles ↗</button>
      </header>
      <section className="loop-stage">
        <div className="loop-intro">
          <p className="world-eyebrow">
            A little movement has a way of adding up.
          </p>
          <h1>
            Good things
            <br />
            <em>come around.</em>
          </h1>
          <p>
            A week made of your outings.
            <br />
            Turn it around. See what’s in it.
          </p>
          <div className="loop-week-chip">
            <span>WEEK 42</span>
            <b>{p.week.label}</b>
          </div>
          <label className="loop-reference-label">
            Alongside
            <select
              aria-label="Loop comparison"
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
          <div className="loop-key">
            <span className="loop-current-key" />
            Your week
            <span className="loop-reference-key" />
            Reference
          </div>
        </div>
        <div id="loop-object" className="loop-object">
          <div className="loop-orbit-surface">
            <button
              className="loop-dial"
              aria-label={`Turn the week dial. ${p.week.label}, ${p.week.total.toFixed(1)} kilometers. Click for the next checkpoint.`}
              onPointerDown={(e) => {
                drag.current = { x: e.clientX, y: e.clientY, moved: false };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const d = drag.current;
                if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8)
                  return;
                d.moved = true;
                const rect = e.currentTarget.getBoundingClientRect();
                let angle =
                  Math.atan2(
                    e.clientY - rect.y - rect.height / 2,
                    e.clientX - rect.x - rect.width / 2,
                  ) +
                  Math.PI / 2;
                if (angle < 0) angle += Math.PI * 2;
                const km = (angle / (Math.PI * 2)) * scale;
                const closest = [0, 1, 2, 3].reduce(
                  (best, i) =>
                    Math.abs(distanceFor(you, i) - km) <
                    Math.abs(distanceFor(you, best) - km)
                      ? i
                      : best,
                  0,
                );
                if (closest !== p.week.cutoff) p.onCutoff(closest);
              }}
              onPointerUp={() => {
                if (drag.current && !drag.current.moved)
                  p.onCutoff((p.week.cutoff + 1) % 4);
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
              onClick={(e) => {
                if (e.detail === 0) p.onCutoff((p.week.cutoff + 1) % 4);
              }}
            >
              <svg
                viewBox="0 0 400 400"
                role="img"
                aria-label={`${p.week.total.toFixed(1)} kilometers of your week and ${p.week.against.toFixed(1)} kilometers of the reference, on a shared ${scale} kilometer circular scale`}
              >
                <circle
                  cx="200"
                  cy="200"
                  r="164"
                  fill="none"
                  stroke="#dfddd4"
                  strokeWidth="18"
                />
                <circle
                  cx="200"
                  cy="200"
                  r="136"
                  fill="none"
                  stroke="#e1e9df"
                  strokeWidth="12"
                />
                {p.week.against > 0 && (
                  <path
                    d={orbitArc(0, p.week.against, scale, 136)}
                    stroke="#76a18e"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                  />
                )}
                {imports.slice(0, p.week.cutoff).map((a, i) => (
                  <path
                    key={a.id}
                    d={orbitArc(
                      distanceFor(you, i) + 0.08,
                      distanceFor(you, i + 1) - 0.08,
                      scale,
                      164,
                    )}
                    stroke={i === 1 ? "#b44637" : "#f3765d"}
                    strokeWidth="18"
                    fill="none"
                    strokeLinecap="round"
                  />
                ))}
                <circle cx={dot.x} cy={dot.y} r="15" fill="#49324b" />
                <circle cx={dot.x} cy={dot.y} r="5" fill="#f5f0e7" />
                <text
                  x="200"
                  y="25"
                  textAnchor="middle"
                  fill="#49324b"
                  fontSize="12"
                >
                  0 KM / MONDAY
                </text>
              </svg>
              <div className="loop-dial-center">
                <Mascot concept="loop" decorative={false} />
                <strong>
                  {p.week.total.toFixed(1)}
                  <small>km</small>
                </strong>
                <span>{p.week.count} outings in your orbit</span>
              </div>
            </button>
          </div>
          <div className="loop-dial-footer">
            <span>{scale} km shared display scale</span>
            <span>Turn to explore ↻</span>
          </div>
          <label className="loop-time-control" htmlFor="loop-time">
            Week position <b>{p.week.label}</b>
            <input
              id="loop-time"
              type="range"
              min="0"
              max="3"
              step="1"
              value={p.week.cutoff}
              onChange={(e) => p.onCutoff(Number(e.target.value))}
            />
          </label>
          <div className="loop-dial-readout" aria-live="polite">
            <strong>{gapText(p.week.gap)}</strong>
            <span>
              {p.reference.ghost
                ? "of your previous week"
                : `compared with ${p.reference.name.split(" ")[0]}`}{" "}
              · same cutoff
            </span>
          </div>
        </div>
      </section>
      <section className="loop-pieces">
        <header>
          <p className="world-eyebrow">THE PIECES OF YOUR WEEK</p>
          <h2>
            Small moves.
            <br /> Something good.
          </h2>
          <button onClick={p.onReplay}>
            {p.playing ? "Pause" : "Watch it take shape"} ↻
          </button>
        </header>
        <div>
          {imports.map((a, i) => (
            <button
              key={a.id}
              className="loop-piece"
              aria-pressed={p.week.cutoff === i + 1}
              onClick={() => p.onCutoff(i + 1)}
            >
              <span>
                0{i + 1} / {a.day}
              </span>
              <svg viewBox="0 0 180 180" aria-hidden="true">
                <circle
                  cx="90"
                  cy="90"
                  r="62"
                  fill="none"
                  stroke="#e4ded8"
                  strokeWidth="10"
                />
                <circle
                  cx="90"
                  cy="90"
                  r="62"
                  fill="none"
                  stroke="#f3765d"
                  strokeWidth="10"
                  strokeDasharray={`${(a.km / 10) * 390} 390`}
                  transform="rotate(-90 90 90)"
                />
              </svg>
              <strong>
                {a.km}
                <small>km added</small>
              </strong>
              <b>{a.title}</b>
            </button>
          ))}
        </div>
      </section>
      <section className="loop-inspector">
        <div>
          <p className="world-eyebrow">{p.week.label} / SELECTED MOMENT</p>
          <h2>
            {p.week.cutoff === 0 ? "The start of something." : current.title}
          </h2>
          <p>
            {p.week.cutoff === 0
              ? "Zero kilometres. Room for the week to take its own shape."
              : current.note}
          </p>
        </div>
        <button
          disabled={p.week.cutoff === 0}
          onClick={() => p.onActivity(current)}
        >
          Open the activity ↗
        </button>
      </section>
      <footer className="loop-footer">
        <Mascot concept="loop" />
        <span>Find your own orbit.</span>
        <small>Luma / a little forward energy</small>
      </footer>
    </main>
  );
}
