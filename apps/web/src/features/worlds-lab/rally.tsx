import {
  comparisonScale,
  gapText,
  imports,
  references,
  checkpoints,
} from "./model";
import { Mascot } from "./mascot";
import type { WorldProps } from "./types";

export function RallyWorld(p: WorldProps) {
  const scale = comparisonScale(p.reference);
  const opponent = p.reference.ghost
    ? "LAST WEEK"
    : p.reference.name.split(" ")[0]!.toUpperCase();
  return (
    <main className="world-product rally-world">
      <header className="rally-header">
        <a className="rally-logo" href="#rally-arena">
          RALLY<span>EVERYDAY PLAY.</span>
        </a>
        <span className="rally-week-label">
          WEEK 42
          <br />
          YOUR HOME BROADCAST
        </span>
        <button onClick={p.onGroups}>Clubhouse ↗</button>
      </header>
      <section className="rally-opening">
        <div>
          <p className="world-eyebrow">
            A little movement. A little friendly competition.
          </p>
          <h1>
            YOUR WEEK
            <br />
            HAS <em>GAME.</em>
          </h1>
        </div>
        <Mascot concept="rally" decorative={false} />
      </section>
      <section
        id="rally-arena"
        className="rally-arena"
        aria-label="Your personal distance matchup"
      >
        <div className="rally-matchup-picker">
          <span>CHOOSE YOUR MATCHUP</span>
          <div>
            {references.map((r) => (
              <button
                key={r.id}
                aria-pressed={p.reference.id === r.id}
                onClick={() => p.onReference(r.id)}
              >
                {r.ghost
                  ? "Me vs. last week"
                  : `Me vs. ${r.name.split(" ")[0]}`}
              </button>
            ))}
          </div>
        </div>
        <div className="rally-scoreboard">
          <div>
            <span>YOU / THIS WEEK</span>
            <strong>{p.week.total.toFixed(1)}</strong>
            <small>km accumulated</small>
          </div>
          <div className="rally-versus">
            <b>VS</b>
            <span>{p.week.label}</span>
          </div>
          <div>
            <span>{opponent} / SAME CUTOFF</span>
            <strong>{p.week.against.toFixed(1)}</strong>
            <small>km accumulated</small>
          </div>
        </div>
        <div
          className="rally-field"
          aria-label={`You ${p.week.total} kilometers, ${opponent} ${p.week.against} kilometers, same ${scale} kilometer scale`}
        >
          <div className="rally-field-lines" aria-hidden="true" />
          <div className="rally-field-lane">
            <span>YOU</span>
            <div className="rally-field-track">
              <div
                className="rally-travel"
                style={{ width: `${(p.week.total / scale) * 100}%` }}
              />
              <div
                className="rally-player-marker"
                style={{ left: `${(p.week.total / scale) * 100}%` }}
              >
                YOU
              </div>
            </div>
          </div>
          <div className="rally-field-lane rally-field-opponent">
            <span>{opponent}</span>
            <div className="rally-field-track">
              <div
                className="rally-travel"
                style={{ width: `${(p.week.against / scale) * 100}%` }}
              />
              <div
                className="rally-player-marker"
                style={{ left: `${(p.week.against / scale) * 100}%` }}
              >
                {p.reference.initials}
              </div>
            </div>
          </div>
          <div className="rally-field-axis">
            <span>START / 0 KM</span>
            <span>{scale} KM DISPLAY SCALE</span>
          </div>
        </div>
        <div className="rally-commentary" aria-live="polite">
          <Mascot concept="rally" />
          <div>
            <span>ACE’S CALL</span>
            <strong>
              {p.week.cutoff === 0
                ? "Everybody starts somewhere."
                : p.week.gap > 0
                  ? "A little ahead. All your own work."
                  : p.week.gap < 0
                    ? "There’s a good game here."
                    : "Side by side. Nice company."}
            </strong>
            <p>
              {gapText(p.week.gap)} · compared at the same{" "}
              {p.week.label.toLowerCase()} cutoff.
            </p>
          </div>
        </div>
        <div className="rally-playback">
          <button className="rally-play" onClick={p.onReplay}>
            {p.playing ? "Ⅱ PAUSE" : "▶ WEEK REPLAY"}
          </button>
          <div>
            {checkpoints.map((label, i) => (
              <button
                key={label}
                onClick={() => p.onCutoff(i)}
                aria-pressed={p.week.cutoff === i}
              >
                {i === 0 ? "Kick-off" : label}
              </button>
            ))}
          </div>
          <small>Recorded milestones</small>
        </div>
      </section>
      <section className="rally-highlights">
        <header>
          <span>THE HIGHLIGHT DESK</span>
          <h2>
            THAT ONE
            <br /> COUNTED.
          </h2>
        </header>
        <div>
          {imports.map((a, i) => (
            <button key={a.id} onClick={() => p.onActivity(a)}>
              <span className="rally-highlight-index">0{i + 1}</span>
              <div>
                <small>{a.day.toUpperCase()} / SAMPLE IMPORT</small>
                <strong>{a.title}</strong>
              </div>
              <b>
                {a.km}
                <small>km ↗</small>
              </b>
            </button>
          ))}
        </div>
      </section>
      <footer className="rally-footer">
        <span>
          GOOD COMPANY.
          <br />
          GOOD GAME.
        </span>
        <p>
          Your movement is the main event.
          <br />
          The matchup is yours to choose.
        </p>
        <Mascot concept="rally" />
      </footer>
    </main>
  );
}
