"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { activities } from "../design-lab/data";
import { ghost } from "../spatial-lab/model";
import { BrandArt, NavIcon } from "./brand-art";
import { LaneTrack } from "./lane-track";
import {
  brandIds,
  brands,
  distanceFor,
  effortFor,
  gapLabel,
  initialLook,
  kits,
  laneRunners,
  milestoneAt,
  milestoneLabels,
  placeFor,
  priorEffortFor,
  skins,
  viewIds,
  you,
  type AvatarLook,
  type BrandId,
  type CameraMode,
  type HairId,
  type KitId,
  type SkinId,
  type TrackMode,
  type ViewId,
} from "./model";
import "./evolution-lab.css";

const Pursuit = dynamic(
  () => import("./pursuit-world").then((m) => m.PursuitWorld),
  {
    ssr: false,
    loading: () => (
      <div className="evo-world-loading">Preparing the track…</div>
    ),
  },
);
const navNames: Record<ViewId, string> = {
  track: "My track",
  field: "The field",
  splits: "Splits",
  athlete: "Athlete",
};
interface Detail {
  title: string;
  body: ReactNode;
}

export function EvolutionLab() {
  const [brand, setBrand] = useState<BrandId>("volt"),
    [view, setView] = useState<ViewId>("track"),
    [mode, setMode] = useState<TrackMode>("lanes"),
    [time, setTime] = useState(3),
    [selected, setSelected] = useState("maya");
  const [showGhost, setShowGhost] = useState(false),
    [playing, setPlaying] = useState(false),
    [extraKm, setExtraKm] = useState(0),
    [camera, setCamera] = useState<CameraMode>("follow"),
    [look, setLook] = useState<AvatarLook>(initialLook),
    [reduced, setReduced] = useState(false),
    [unavailable, setUnavailable] = useState(false),
    [evaluate, setEvaluate] = useState(false),
    [detail, setDetail] = useState<Detail | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    direction = brands[brand],
    person =
      selected === "ghost"
        ? ghost
        : (laneRunners.find((r) => r.id === selected) ?? you);
  const total = distanceFor(you, time, extraKm),
    effort = effortFor(time),
    previous = priorEffortFor(time),
    place = placeFor("you", time, extraKm);
  useEffect(() => {
    function restore() {
      const q = new URLSearchParams(window.location.search),
        b = q.get("brand"),
        v = q.get("view"),
        m = q.get("mode");
      if (brandIds.includes(b as BrandId)) setBrand(b as BrandId);
      if (viewIds.includes(v as ViewId)) setView(v as ViewId);
      if (m === "pursuit" || m === "lanes") setMode(m);
    }
    restore();
    window.addEventListener("popstate", restore);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => {
      window.removeEventListener("popstate", restore);
      media.removeEventListener("change", update);
    };
  }, []);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (detail && !el.open) el.showModal();
    if (!detail && el.open) el.close();
  }, [detail]);
  useEffect(() => {
    if (!playing) return;
    const start = performance.now();
    let frame = 0,
      last = 0;
    function advance(now: number) {
      const fraction = Math.min(1, (now - start) / 10000),
        progress = fraction * 3;
      if (now - last > 45 || fraction === 1) {
        setTime(reduced ? Math.min(3, Math.floor(progress)) : progress);
        last = now;
      }
      if (fraction < 1) frame = requestAnimationFrame(advance);
      else setPlaying(false);
    }
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [playing, reduced]);
  function navigate(nextBrand = brand, nextView = view, nextMode = mode) {
    if (nextView !== view) setTime(3);
    setBrand(nextBrand);
    setView(nextView);
    setMode(nextMode);
    setEvaluate(false);
    setPlaying(false);
    setExtraKm(0);
    window.history.replaceState(
      null,
      "",
      `/design/evolution?brand=${nextBrand}&view=${nextView}&mode=${nextMode}`,
    );
    window.scrollTo(0, 0);
  }
  function milestone(t: number) {
    setPlaying(false);
    setTime(t);
    setExtraKm(0);
  }
  function activityReceipt(id: string) {
    const activity = activities.find((a) => a.id === id)!;
    setDetail({
      title: `${activity.title} / Counted`,
      body: (
        <>
          <p className="evo-kicker">{activity.date} · Sample tracker import</p>
          <div className="evo-receipt-value">
            +{activity.points}
            <small>effort pts</small>
          </div>
          <p>
            {activity.km} km · {activity.minutes} min. Imported running
            activity, counted once.
          </p>
          <p>{activity.note}</p>
          <p className="evo-small">
            Presentation fixture. No tracker authorization or sync request is
            made.
          </p>
        </>
      ),
    });
  }
  function weekReceipt() {
    setDetail({
      title: "A week, recorded.",
      body: (
        <>
          <BrandArt brand={brand} small />
          <div className="evo-receipt-value">
            96<small>effort pts</small>
          </div>
          <p>
            4th of this 9-person sample field · 3 counted imports · 19.2 km.
          </p>
          <p className="evo-small">
            Week-close design preview. The current sample Thursday is still in
            progress; opening this does not settle the live period or update
            your rating.
          </p>
        </>
      ),
    });
  }
  function groups() {
    setDetail({
      title: "Your optional circles",
      body: (
        <>
          <p>
            Your personal track stays the main experience. Groups give you
            another field when you want one.
          </p>
          <div className="evo-group-row">
            <BrandArt brand={brand} small />
            <div>
              <strong>Sunday Miles</strong>
              <span>Private · 9 sample members</span>
            </div>
          </div>
          <button
            className="evo-primary"
            onClick={() =>
              setDetail({
                title: "Sunday Miles / Preview",
                body: (
                  <p>
                    A private comparison using the same weekly distance cutoff.
                    This prototype does not join or write to a group.
                  </p>
                ),
              })
            }
          >
            Inspect the group ↗
          </button>
        </>
      ),
    });
  }
  const sceneProps = {
    time,
    extraKm,
    selected,
    showGhost,
    onSelect: setSelected,
  };
  const controls = (
    <div className="evo-replay">
      <div>
        <label htmlFor="evo-time">Rewind your week</label>
        <button
          onClick={() => {
            if (playing) setPlaying(false);
            else {
              setTime(0);
              setExtraKm(0);
              setPlaying(true);
            }
          }}
        >
          {playing ? "Pause" : reduced ? "Play milestones" : "Play from start"}{" "}
          {playing ? "Ⅱ" : "▷"}
        </button>
      </div>
      <input
        id="evo-time"
        aria-label="Week replay"
        aria-valuetext={milestoneAt(time)}
        type="range"
        min="0"
        max="3"
        step=".01"
        value={time}
        onChange={(e) => milestone(Number(e.target.value))}
      />
      <div className="evo-milestones">
        {milestoneLabels.map((label, i) => (
          <button
            key={label}
            aria-pressed={time === i}
            onClick={() => milestone(i)}
          >
            {i === 0 ? "Start" : label}
          </button>
        ))}
      </div>
      <p>
        {milestoneAt(time)} ·{" "}
        {time === 0
          ? "Same zero origin. Lane position is not rank."
          : time === 2
            ? view === "track"
              ? "Tuesday: 65 effort points, 12 ahead of past-you at this cutoff."
              : "Your 7.1 km import put you 0.6 km ahead of Maya."
            : time === 3
              ? view === "track"
                ? "Thursday: 96 effort points, 16 ahead of past-you at this cutoff."
                : "Thursday total: 19.2 km. Maya is now 0.9 km ahead."
              : Number.isInteger(time)
                ? "A recorded sample milestone."
                : "Presentation interpolation, not live GPS or activity timing."}
      </p>
    </div>
  );
  return (
    <div className={`evolution-lab evo-${brand}`}>
      <a className="evo-skip" href="#evo-main">
        Skip to prototype
      </a>
      <header className="evo-lab-bar">
        <Link href="/design">← Original study</Link>
        <span>BEYOND BOUNCE / SPLIT FOUNDATION</span>
        <button
          aria-expanded={evaluate}
          onClick={() => {
            setEvaluate((v) => !v);
            setPlaying(false);
          }}
        >
          {evaluate ? "Back to app" : "Compare identities"} ↗
        </button>
      </header>
      <nav className="evo-brand-picker" aria-label="Brand direction">
        {brandIds.map((id) => (
          <button
            key={id}
            aria-pressed={brand === id}
            onClick={() => navigate(id)}
          >
            <span>{brands[id].name}</span>
            <small>{brands[id].mood.split(" / ")[0]}</small>
          </button>
        ))}
      </nav>
      {evaluate ? (
        <section className="evo-evaluation">
          <p className="evo-kicker">Coherence is more than a character</p>
          <h1>
            Four different ways
            <br />
            to feel like an athlete.
          </h1>
          <p>
            Split’s four jobs stay practical. Character silhouette, component
            geometry, typography, color, and voice change together. These are
            hypotheses to test, not usability results.
          </p>
          <div className="evo-identity-grid">
            {brandIds.map((id) => (
              <article className={`evo-${id}`} key={id}>
                <BrandArt brand={id} />
                <h2>{brands[id].name}</h2>
                <p>{brands[id].mood}</p>
                <dl>
                  {(
                    [
                      ["Companion", brands[id].companion],
                      ["Shape language", brands[id].shape],
                      ["Typography", brands[id].type],
                      ["Voice", brands[id].voice],
                      ["Proof of coherence", brands[id].proof],
                      ["Watch for", brands[id].risk],
                      ["Test", brands[id].test],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <button onClick={() => navigate(id, "track")}>
                  Explore this identity ↗
                </button>
              </article>
            ))}
          </div>
          <p className="evo-recommendation">
            Current leading bets: EVEN for a broad consumer audience, VOLT for
            competitive energy, CURRENT for a clean product, and FORM for quiet
            credibility.
          </p>
        </section>
      ) : (
        <div className="evo-product" data-brand={brand} data-view={view}>
          <header className="evo-product-header">
            <button
              className="evo-wordmark"
              onClick={() => navigate(brand, "track")}
            >
              <span className="evo-logo-symbol">
                <BrandArt brand={brand} small />
              </span>
              {direction.name}
              <i>
                {brand === "volt"
                  ? "↗"
                  : brand === "form"
                    ? "/"
                    : brand === "even"
                      ? "·"
                      : "◌"}
              </i>
            </button>
            <div>
              <span className="evo-week-label">WEEK 42 / RUNNING</span>
              <button
                className="evo-circles"
                aria-label="Open optional groups"
                onClick={groups}
              >
                ○○
              </button>
              <button
                className="evo-profile-dot"
                aria-label="Open athlete"
                onClick={() => navigate(brand, "athlete")}
              >
                JL
              </button>
            </div>
          </header>
          <div className="evo-product-layout">
            <nav className="evo-product-nav" aria-label="App navigation">
              {viewIds.map((id) => (
                <button
                  key={id}
                  aria-current={view === id ? "page" : undefined}
                  onClick={() => navigate(brand, id)}
                >
                  <NavIcon kind={id} />
                  <span>{navNames[id]}</span>
                </button>
              ))}
              <div className="evo-nav-signature">
                <BrandArt brand={brand} small />
                <span>{direction.line}</span>
              </div>
            </nav>
            <main id="evo-main" className="evo-main">
              <div className="evo-sample-bar">
                <span>Oct 12–19 · UTC · Sample week</span>
                <span>
                  Running / {view === "field" ? "Distance" : "Effort"}
                </span>
              </div>
              {view === "track" ? (
                <>
                  <section className="evo-home-hero">
                    <div className="evo-hero-copy">
                      <p className="evo-kicker">
                        {brand === "volt"
                          ? "Your week. Your edge."
                          : brand === "form"
                            ? "Personal record / 042"
                            : brand === "even"
                              ? "A little movement adds up."
                              : "Your week, in view."}
                      </p>
                      <h1>
                        {direction.heading.split("\n").map((line, i) => (
                          <span key={line}>
                            {line}
                            {i === 0 && <br />}
                          </span>
                        ))}
                      </h1>
                      <div className="evo-score">
                        <strong>{Math.round(effort)}</strong>
                        <span>
                          effort
                          <br />
                          points
                        </span>
                      </div>
                      <p className="evo-hero-verdict">
                        <b>+{Math.round(effort - previous)}</b> vs your previous
                        week · same cutoff
                      </p>
                      <button
                        className="evo-primary"
                        onClick={() => navigate(brand, "field", "lanes")}
                      >
                        {brand === "volt"
                          ? "Enter the field"
                          : brand === "form"
                            ? "Inspect your field"
                            : brand === "even"
                              ? "See who's nearby"
                              : "Find your position"}
                        <span>↗</span>
                      </button>
                    </div>
                    <div className="evo-hero-art">
                      <span className="evo-orbit one" />
                      <span className="evo-orbit two" />
                      <BrandArt brand={brand} />
                      <p>
                        {brand === "volt"
                          ? "MOVE MADE."
                          : brand === "form"
                            ? "EFFORT / RECORDED"
                            : brand === "even"
                              ? "That one counted."
                              : "In your own flow."}
                      </p>
                    </div>
                  </section>
                  <div className="evo-home-summary">
                    <div>
                      <span>Your distance</span>
                      <strong>
                        {total.toFixed(1)}
                        <small>km</small>
                      </strong>
                    </div>
                    <div>
                      <span>In your field</span>
                      <strong>
                        {time === 0 ? "—" : place}
                        <small>/ 9</small>
                      </strong>
                    </div>
                    <div>
                      <span>Counted imports</span>
                      <strong>
                        {Number.isInteger(time) ? time : "—"}
                        <small>runs</small>
                      </strong>
                    </div>
                  </div>
                  <section className="evo-personal-track">
                    <div className="evo-section-heading">
                      <h2>Your line. Past you.</h2>
                      <span>Effort points · same cutoff</span>
                    </div>
                    <div className="evo-score-lanes">
                      {[
                        { label: "YOUR WEEK", value: effort, mine: true },
                        { label: "PAST YOU", value: previous, mine: false },
                      ].map((row) => (
                        <div
                          className={row.mine ? "score-lane-mine" : ""}
                          key={row.label}
                        >
                          <span>{row.label}</span>
                          <div className="evo-score-road">
                            <i
                              style={{ width: `${(row.value / 130) * 100}%` }}
                            />
                            <b style={{ left: `${(row.value / 130) * 100}%` }}>
                              {Math.round(row.value)}
                            </b>
                          </div>
                          <strong>{Math.round(row.value)}</strong>
                        </div>
                      ))}
                    </div>
                    {controls}
                  </section>
                  <div className="evo-home-bottom">
                    <button
                      className="evo-latest"
                      onClick={() => activityReceipt("morning")}
                    >
                      <span className="evo-activity-mark">03</span>
                      <div>
                        <small>Latest counted import / Thursday</small>
                        <h3>Morning run</h3>
                        <p>6.2 km · 34 min</p>
                      </div>
                      <strong>
                        +31<small>pts ↗</small>
                      </strong>
                    </button>
                    <button className="evo-week-preview" onClick={weekReceipt}>
                      <BrandArt brand={brand} small />
                      <div>
                        <strong>Your week, kept.</strong>
                        <span>Preview the week-close receipt ↗</span>
                      </div>
                    </button>
                  </div>
                </>
              ) : view === "field" ? (
                <>
                  <div className="evo-field-heading">
                    <div>
                      <p className="evo-kicker">
                        {mode === "lanes"
                          ? "A track you can read"
                          : "A world you move through"}
                      </p>
                      <h1>The field.</h1>
                      <p>
                        {mode === "lanes"
                          ? "Nine lanes. Real mileage gaps."
                          : "Your runner. Your starting line. Your forward."}
                      </p>
                    </div>
                    <div className="evo-distance-readout">
                      <strong>
                        {total.toFixed(1)}
                        <small>km</small>
                      </strong>
                      <span>
                        {extraKm > 0 ? "WHAT-IF" : "YOUR WEEK"} ·{" "}
                        {time === 0 ? "START" : `${place} / 9`}
                      </span>
                    </div>
                  </div>
                  <div className="evo-field-toolbar">
                    <div className="evo-mode-switch">
                      <button
                        aria-pressed={mode === "lanes"}
                        onClick={() => navigate(brand, "field", "lanes")}
                      >
                        2D lanes
                      </button>
                      <button
                        aria-pressed={mode === "pursuit"}
                        onClick={() => {
                          setUnavailable(false);
                          navigate(brand, "field", "pursuit");
                        }}
                      >
                        3D Pursuit
                      </button>
                    </div>
                    <button
                      aria-pressed={showGhost}
                      onClick={() => {
                        if (showGhost && selected === "ghost")
                          setSelected("you");
                        setShowGhost((v) => !v);
                      }}
                    >
                      {showGhost ? "Hide past you" : "Add past you"}
                    </button>
                  </div>
                  <div className="evo-field-layout">
                    <div className="evo-field-scene">
                      {mode === "pursuit" && !unavailable ? (
                        <>
                          <div className="evo-camera-controls">
                            {(["follow", "above", "avatar"] as const).map(
                              (id) => (
                                <button
                                  key={id}
                                  aria-pressed={camera === id}
                                  onClick={() => setCamera(id)}
                                >
                                  {id === "follow"
                                    ? "Follow runner"
                                    : id === "above"
                                      ? "From above"
                                      : "My avatar"}
                                </button>
                              ),
                            )}
                          </div>
                          <Pursuit
                            {...sceneProps}
                            look={look}
                            camera={camera}
                            onUnavailable={() => setUnavailable(true)}
                          />
                          <div className="evo-world-caption">
                            <span>
                              Third person / Drag to orbit / Scroll to zoom
                            </span>
                            <span>Virtual scale · Not live GPS</span>
                          </div>
                        </>
                      ) : (
                        <LaneTrack {...sceneProps} />
                      )}{" "}
                      {unavailable && (
                        <p className="evo-fallback" role="status">
                          3D is unavailable here. The 2D track stays
                          interactive.
                        </p>
                      )}
                      {controls}
                    </div>
                    <aside
                      className="evo-runner-inspector"
                      aria-live={
                        !playing && Number.isInteger(time) ? "polite" : "off"
                      }
                    >
                      <p className="evo-kicker">Selected runner</p>
                      <span
                        className={`evo-runner-token ${person.you ? "token-you" : ""}`}
                      >
                        {person.initials}
                      </span>
                      <h2>{person.name}</h2>
                      <strong>
                        {distanceFor(person, time, extraKm).toFixed(1)}
                        <small>km</small>
                      </strong>
                      <p className="evo-gap">
                        {gapLabel(person, time, extraKm)}
                      </p>
                      <dl>
                        <div>
                          <dt>Distance rank</dt>
                          <dd>
                            {person.ghost
                              ? "Reference"
                              : `${placeFor(person.id, time, extraKm)} / 9`}
                          </dd>
                        </div>
                        <div>
                          <dt>Cutoff</dt>
                          <dd>
                            {Number.isInteger(time)
                              ? milestoneAt(time)
                              : "Replay frame"}
                          </dd>
                        </div>
                      </dl>
                      <button
                        className="evo-outline"
                        onClick={() =>
                          setDetail({
                            title: `${person.name} / Distance`,
                            body: (
                              <>
                                <div className="evo-receipt-value">
                                  {distanceFor(person, time, extraKm).toFixed(
                                    1,
                                  )}
                                  <small>km</small>
                                </div>
                                <p>
                                  {gapLabel(person, time, extraKm)} · Same
                                  cutoff.
                                </p>
                                <ul>
                                  {person.km.map((km, i) => (
                                    <li key={i}>
                                      {milestoneLabels[i + 1]}: {km.toFixed(1)}{" "}
                                      km cumulative
                                    </li>
                                  ))}
                                </ul>
                                <p className="evo-small">
                                  Synthetic imported totals, never live
                                  location.{" "}
                                  {extraKm > 0 && person.you
                                    ? `Includes ${extraKm} km of what-if distance.`
                                    : ""}
                                </p>
                              </>
                            ),
                          })
                        }
                      >
                        Distance receipt ↗
                      </button>
                      <div className="evo-what-if">
                        <label htmlFor="evo-extra">
                          What if you added distance?
                          <strong>+{extraKm.toFixed(1)} km</strong>
                        </label>
                        <input
                          id="evo-extra"
                          type="range"
                          min="0"
                          max="40"
                          step=".1"
                          value={extraKm}
                          aria-label="Hypothetical distance"
                          onChange={(e) => {
                            setPlaying(false);
                            setExtraKm(Number(e.target.value));
                          }}
                        />
                        <p>
                          A presentation preview. Never logs a workout or
                          changes effort points.
                        </p>
                        <button
                          disabled={extraKm === 0}
                          onClick={() => setExtraKm(0)}
                        >
                          Reset preview
                        </button>
                      </div>
                      {mode === "pursuit" && !unavailable && (
                        <details className="evo-avatar-editor">
                          <summary>Your runner’s look</summary>
                          <p>
                            Local styling preview. Every look moves the same
                            distance.
                          </p>
                          <fieldset>
                            <legend>Kit</legend>
                            {(Object.keys(kits) as KitId[]).map((id) => (
                              <button
                                key={id}
                                style={{ background: kits[id] }}
                                aria-label={`${id} kit`}
                                aria-pressed={look.kit === id}
                                onClick={() => setLook({ ...look, kit: id })}
                              />
                            ))}
                          </fieldset>
                          <fieldset>
                            <legend>Skin</legend>
                            {(Object.keys(skins) as SkinId[]).map((id) => (
                              <button
                                key={id}
                                style={{ background: skins[id] }}
                                aria-label={`${id} skin tone`}
                                aria-pressed={look.skin === id}
                                onClick={() => setLook({ ...look, skin: id })}
                              />
                            ))}
                          </fieldset>
                          <fieldset className="evo-hair">
                            <legend>Hair / headwear</legend>
                            {(["crop", "bun", "cap"] as HairId[]).map((id) => (
                              <button
                                key={id}
                                aria-pressed={look.hair === id}
                                onClick={() => setLook({ ...look, hair: id })}
                              >
                                {id}
                              </button>
                            ))}
                          </fieldset>
                        </details>
                      )}
                    </aside>
                  </div>
                  <section className="evo-field-roster">
                    <div className="evo-section-heading">
                      <h2>Your exact field</h2>
                      <span>9 sample runners · Lane ≠ rank</span>
                    </div>
                    <div>
                      {[...laneRunners]
                        .sort(
                          (a, b) =>
                            distanceFor(b, time, extraKm) -
                            distanceFor(a, time, extraKm),
                        )
                        .map((r) => (
                          <button
                            key={r.id}
                            className={`${r.you ? "roster-you" : ""} ${selected === r.id ? "roster-selected" : ""}`}
                            onClick={() => setSelected(r.id)}
                          >
                            <span>{placeFor(r.id, time, extraKm)}</span>
                            <div>
                              <strong>{r.name}</strong>
                              <small>{gapLabel(r, time, extraKm)}</small>
                            </div>
                            <b>
                              {distanceFor(r, time, extraKm).toFixed(1)}
                              <small>km</small>
                            </b>
                          </button>
                        ))}
                    </div>
                  </section>
                </>
              ) : view === "splits" ? (
                <>
                  <div className="evo-page-heading">
                    <p className="evo-kicker">Your source of truth</p>
                    <h1>
                      {brand === "form" ? "The record." : "Every move counts."}
                    </h1>
                    <p>Three imports. One clear total. Nothing to log twice.</p>
                  </div>
                  <div className="evo-log-total">
                    <strong>
                      96<small>effort points</small>
                    </strong>
                    <BrandArt brand={brand} small />
                    <span>3 COUNTED / 19.2 KM / 109 MIN</span>
                  </div>
                  <div className="evo-activity-list">
                    {activities.map((a, i) => (
                      <button key={a.id} onClick={() => activityReceipt(a.id)}>
                        <span className="evo-activity-mark">0{3 - i}</span>
                        <div>
                          <small>
                            {a.day} / {a.date}
                          </small>
                          <h2>{a.title}</h2>
                          <p>
                            {a.km} km · {a.minutes} min · Imported
                          </p>
                        </div>
                        <strong>
                          +{a.points}
                          <small>pts ↗</small>
                        </strong>
                        <span className="evo-counted-stamp">
                          {brand === "volt"
                            ? "MOVE MADE"
                            : brand === "form"
                              ? "RECORDED"
                              : brand === "even"
                                ? "That one counted"
                                : "IN YOUR FLOW"}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    className="evo-source-receipt"
                    onClick={() =>
                      setDetail({
                        title: "Your source, clearly.",
                        body: (
                          <>
                            <p>
                              Three counted running imports are presentation
                              fixtures.
                            </p>
                            <p>
                              In the product, tracker permission, latest sync
                              time, counted status, and duplicates belong here.
                              This preview does not authorize a tracker.
                            </p>
                          </>
                        ),
                      })
                    }
                  >
                    <span className="evo-sync-symbol">↻</span>
                    <div>
                      <strong>Automatic imports</strong>
                      <span>Sample source · Inspect what counted</span>
                    </div>
                    <span>↗</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="evo-page-heading">
                    <p className="evo-kicker">The athlete behind the week</p>
                    <h1>
                      {brand === "form"
                        ? "Your record."
                        : brand === "even"
                          ? "Your own rhythm."
                          : "Made by you."}
                    </h1>
                  </div>
                  <section className="evo-athlete-plate">
                    <div className="evo-athlete-identity">
                      <span>042 / RUNNING</span>
                      <h2>
                        Jerry
                        <br />
                        Liu.
                      </h2>
                      <p>Here for the next good week.</p>
                    </div>
                    <BrandArt brand={brand} />
                    <div className="evo-athlete-stats">
                      <div>
                        <span>This week</span>
                        <strong>
                          19.2<small>km</small>
                        </strong>
                      </div>
                      <div>
                        <span>Counted effort</span>
                        <strong>
                          96<small>pts</small>
                        </strong>
                      </div>
                      <div>
                        <span>Sample field</span>
                        <strong>
                          4<small>/ 9</small>
                        </strong>
                      </div>
                    </div>
                  </section>
                  <div className="evo-section-heading">
                    <h2>Your weeks, kept.</h2>
                    <span>Closed sample periods</span>
                  </div>
                  <div className="evo-history">
                    {[
                      { period: "Oct 5–12", points: 118, place: 5 },
                      { period: "Sep 28–Oct 5", points: 104, place: 6 },
                      { period: "Sep 21–28", points: 112, place: 4 },
                    ].map((week, i) => (
                      <button
                        key={week.period}
                        onClick={() =>
                          setDetail({
                            title: `${week.period} / Closed week`,
                            body: (
                              <>
                                <BrandArt brand={brand} small />
                                <div className="evo-receipt-value">
                                  {week.points}
                                  <small>effort pts</small>
                                </div>
                                <p>
                                  {week.place}th of 9 · Complete sample week.
                                </p>
                                <p>
                                  Monday-to-Monday UTC bounds. This archived
                                  period is separate from the same-Thursday
                                  ghost comparison.
                                </p>
                              </>
                            ),
                          })
                        }
                      >
                        <span className="evo-history-stamp">
                          {i === 0 ? "41" : i === 1 ? "40" : "39"}
                        </span>
                        <div>
                          <strong>{week.period}</strong>
                          <span>Complete · Place {week.place} / 9</span>
                        </div>
                        <b>
                          {week.points}
                          <small>pts ↗</small>
                        </b>
                      </button>
                    ))}
                  </div>
                  <button
                    className="evo-outline evo-preview-week"
                    onClick={weekReceipt}
                  >
                    Preview a week-close receipt ↗
                  </button>
                </>
              )}
            </main>
          </div>
          <footer className="evo-product-footer">
            <BrandArt brand={brand} small />
            <span>{direction.line}</span>
            <small>Presentation fixtures · No tracker writes</small>
          </footer>
        </div>
      )}
      <footer className="evo-lab-footer">
        <span>
          Four new identities / Split’s practical structure / Nine-lane track /
          Third-person Pursuit
        </span>
        <Link href="/design/spatial">Earlier spatial concepts ↗</Link>
      </footer>
      <dialog
        ref={dialog}
        className="evo-dialog"
        aria-labelledby="evo-detail-title"
        onClose={() => setDetail(null)}
        onCancel={() => setDetail(null)}
      >
        <header>
          <h2 id="evo-detail-title">{detail?.title}</h2>
          <button aria-label="Close detail" onClick={() => setDetail(null)}>
            ×
          </button>
        </header>
        <div>{detail?.body}</div>
        <button className="evo-primary" onClick={() => setDetail(null)}>
          Back to my week ↗
        </button>
      </dialog>
    </div>
  );
}
