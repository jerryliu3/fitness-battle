import { useEffect, useRef, useState } from "react";
import { distanceFor, you } from "../evolution-lab/model";
import { checkpoints, gapText, imports, references } from "./model";
import { Mascot } from "./mascot";
import type { WorldProps } from "./types";

const routeY = (km: number) => 252 + Math.sin(km * 0.38) * 36;
export function RoamWorld(p: WorldProps) {
  const [nearby, setNearby] = useState(false),
    [pan, setPan] = useState<number | null>(null);
  const [width, setWidth] = useState(900);
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(entries[0]!.contentRect.width),
    );
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  const span = width < 600 ? 10 : 30;
  const min = pan ?? Math.max(0, p.week.total - (width < 600 ? 4 : 18));
  const max = min + span;
  const x = (km: number) => 45 + ((km - min) / span) * (width - 90);
  const coords = Array.from({ length: 101 }, (_, i) => {
    const km = min + (span * i) / 100;
    return `${i === 0 ? "M" : "L"} ${x(km)} ${routeY(km)}`;
  }).join(" ");
  const visible = (km: number) => km >= min && km <= max;
  const markers = nearby ? [p.reference, you] : [you];
  return (
    <main className="world-product roam-world">
      <header className="roam-header">
        <a className="roam-logo" href="#roam-landscape">
          ROAM<span>GOOD THINGS ARE OUT THERE.</span>
        </a>
        <button onClick={p.onGroups}>A little company ↗</button>
      </header>
      <section className="roam-opening">
        <p className="world-eyebrow">Your week, a little further along.</p>
        <h1>
          A different view.
          <br />
          <em>Every time you move.</em>
        </h1>
        <div>
          <span>
            {p.week.total.toFixed(1)}
            <small>km into your week</small>
          </span>
          <p>
            {p.week.label} / {p.week.count} counted outings
            <br />
            The next bit is yours.
          </p>
        </div>
      </section>
      <section
        ref={stage}
        id="roam-landscape"
        className="roam-landscape"
        aria-label="A fictional landscape showing accumulated weekly distance"
      >
        <div className="roam-sun" aria-hidden="true" />
        <svg
          className="roam-scenery"
          width="100%"
          height="100%"
          viewBox="0 0 1000 400"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <path
            d="M0 195L105 102L170 161L260 48L420 204L550 70L650 149L735 90L885 188L1000 100V400H0Z"
            fill="#b1c6f2"
          />
          <path
            d="M170 161L260 48L345 140L269 116L242 130L223 114Z M491 146L550 70L610 123L554 107L531 119Z"
            fill="#f5f8ff"
          />
          <path
            d="M0 260Q170 130 370 236T760 221Q900 166 1000 236V400H0Z"
            fill="#7dace6"
          />
          <path
            d="M0 292Q120 229 298 278T641 282Q825 219 1000 270V400H0Z"
            fill="#3c78c8"
          />
          <path d="M0 332Q230 268 490 330T1000 309V400H0Z" fill="#1f5ca9" />
        </svg>
        <div className="roam-window-label">
          {min.toFixed(1)}–{max.toFixed(1)} km / FICTIONAL LANDSCAPE
        </div>
        <svg
          className="roam-route"
          width="100%"
          height="400"
          viewBox={`0 0 ${width} 400`}
          role="img"
          aria-label={`Distance window ${min.toFixed(1)} to ${max.toFixed(1)} kilometers. You are at ${p.week.total.toFixed(1)} kilometers.`}
        >
          <path d={coords} stroke="#c9dbf4" strokeWidth="22" fill="none" />
          <path
            d={coords}
            stroke="#fff3a4"
            strokeWidth="4"
            fill="none"
            strokeDasharray="2 11"
          />
          {Array.from(
            { length: Math.ceil(span / 5) + 1 },
            (_, i) => Math.ceil(min / 5) * 5 + i * 5,
          )
            .filter(
              (km) =>
                visible(km) &&
                markers.every(
                  (r) =>
                    Math.abs(x(km) - x(distanceFor(r, p.week.cutoff))) > 65,
                ),
            )
            .map((km) => (
              <g key={km}>
                <path
                  d={`M${x(km)} ${routeY(km) - 14}v-24`}
                  stroke="#193a6f"
                  strokeWidth="3"
                />
                <rect
                  x={x(km) - 24}
                  y={routeY(km) - 62}
                  width="48"
                  height="24"
                  rx="4"
                  fill="#fcf8df"
                />
                <text
                  x={x(km)}
                  y={routeY(km) - 45}
                  textAnchor="middle"
                  fill="#173d77"
                  fontSize="12"
                  fontWeight="700"
                >
                  {km} km
                </text>
              </g>
            ))}
        </svg>
        {visible(0) && (
          <div
            className="roam-start"
            style={{ left: x(0), top: routeY(0) + 24 }}
          >
            MONDAY
            <br />
            <b>START / 0 KM</b>
          </div>
        )}
        {markers.map((r) => {
          const km = distanceFor(r, p.week.cutoff);
          return visible(km) ? (
            <div
              key={r.id}
              className={`roam-traveller ${r.you ? "roam-you" : "roam-reference"}`}
              style={{ left: x(km), top: routeY(km) }}
            >
              {r.you ? (
                <Mascot concept="roam" decorative={false} />
              ) : (
                <span className="roam-companion-dot">{r.initials}</span>
              )}
              <span>
                {r.you
                  ? "YOU"
                  : r.ghost
                    ? "PREVIOUS WEEK"
                    : r.name.split(" ")[0]}
                <b>{km.toFixed(1)} km</b>
              </span>
            </div>
          ) : null;
        })}
        <div className="roam-look-controls">
          <button
            aria-label="Look back along the route"
            onClick={() => setPan(Math.max(0, min - span * 0.6))}
            disabled={min === 0}
          >
            ← Look back
          </button>
          <button onClick={() => setPan(null)}>Find me</button>
          <button
            aria-label="Look ahead along the route"
            onClick={() => setPan(min + span * 0.6)}
          >
            Look ahead →
          </button>
        </div>
      </section>
      <section className="roam-travel-controls">
        <div className="roam-waypoints" aria-label="Travel through the week">
          {checkpoints.map((day, i) => (
            <button
              key={day}
              aria-pressed={p.week.cutoff === i}
              onClick={() => {
                setPan(null);
                p.onCutoff(i);
              }}
            >
              <span>{i === 0 ? "○" : "●"}</span>
              {day}
            </button>
          ))}
        </div>
        <button
          className="roam-replay"
          onClick={() => {
            setPan(null);
            p.onReplay();
          }}
        >
          {p.playing ? "Pause the journey" : "Travel through the week"} ↗
        </button>
      </section>
      <section className="roam-company">
        <div>
          <p className="world-eyebrow">Go at your own pace.</p>
          <h2>{gapText(p.week.gap)}.</h2>
          <p>
            {p.reference.ghost
              ? "Compared with your previous week"
              : `Compared with ${p.reference.name}`}{" "}
            at the same cutoff.
          </p>
        </div>
        <div>
          <label className="roam-company-toggle">
            <input
              type="checkbox"
              checked={nearby}
              onChange={(e) => setNearby(e.target.checked)}
            />
            Show company on the trail
          </label>
          <select
            aria-label="Trail comparison"
            value={p.reference.id}
            onChange={(e) => p.onReference(e.target.value)}
          >
            {references.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </section>
      <section className="roam-journal">
        <header>
          <span>NOTES FROM OUT THERE</span>
          <h2>
            You got out.
            <br /> It added up.
          </h2>
        </header>
        <div>
          {imports.map((a) => (
            <button key={a.id} onClick={() => p.onActivity(a)}>
              <span>
                {a.day} / {a.date}
              </span>
              <strong>{a.title}</strong>
              <b>{a.km} km ↗</b>
              <p>{a.note}</p>
            </button>
          ))}
        </div>
      </section>
      <footer className="roam-footer">
        <span>
          THE WORLD CAN WAIT.
          <br />
          YOUR NEXT BIT WILL BE HERE.
        </span>
        <p>
          Rove is your travelling companion.
          <br />A week made from the movement you already did.
        </p>
      </footer>
    </main>
  );
}
