"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DistancePath, ReplayLanes } from "./flat-views";
import {
  cutoffLabel,
  distanceAt,
  formatDistance,
  formatGap,
  ghost,
  lapKm,
  orderedAt,
  rankAt,
  runners,
  spatialDirections,
  spatialIds,
  type CameraView,
  type DistanceUnit,
  type SpatialId,
} from "./model";
import type { CameraRequest } from "./world";
import "./spatial-lab.css";

const World = dynamic(
  () => import("./world").then((module) => module.DistanceWorld),
  {
    ssr: false,
    loading: () => (
      <div className="world-loading">
        <span />
        Building your distance field…
      </div>
    ),
  },
);

export function SpatialLab() {
  const [scene, setScene] = useState<SpatialId>("pursuit"),
    [time, setTime] = useState(2),
    [extraKm, setExtraKm] = useState(0),
    [unit, setUnit] = useState<DistanceUnit>("km");
  const [selected, setSelected] = useState("maya"),
    [showGhost, setShowGhost] = useState(false),
    [playing, setPlaying] = useState(false),
    [reduced, setReduced] = useState(false),
    [unavailable, setUnavailable] = useState(false),
    [evaluate, setEvaluate] = useState(false),
    [receipt, setReceipt] = useState(false);
  const [cameraRequest, setCameraRequest] = useState<CameraRequest>({
    view: "follow",
    revision: 0,
    targetId: "all",
  });
  const dialog = useRef<HTMLDialogElement>(null);
  const direction = spatialDirections[scene],
    you = distanceAt(runners[3]!, time, extraKm),
    person =
      selected === "ghost"
        ? ghost
        : (runners.find((r) => r.id === selected) ?? runners[3]!);
  const selectedDistance = distanceAt(person, time, extraKm),
    place = rankAt("you", time, extraKm),
    baselinePlace = rankAt("you", time);
  useEffect(() => {
    function read() {
      const id = new URLSearchParams(window.location.search).get("scene");
      if (spatialIds.includes(id as SpatialId)) setScene(id as SpatialId);
    }
    read();
    window.addEventListener("popstate", read);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const changed = () => setReduced(media.matches);
    media.addEventListener("change", changed);
    return () => {
      window.removeEventListener("popstate", read);
      media.removeEventListener("change", changed);
    };
  }, []);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (receipt && !element.open) element.showModal();
    if (!receipt && element.open) element.close();
  }, [receipt]);
  useEffect(() => {
    if (!playing) return;
    const started = performance.now(),
      duration = 8000;
    let frame = 0,
      last = 0;
    const animate = (now: number) => {
      const progress = Math.min(2, ((now - started) / duration) * 2);
      if (now - last > 50 || progress === 2) {
        setTime(
          reduced ? (progress < 0.66 ? 0 : progress < 1.33 ? 1 : 2) : progress,
        );
        last = now;
      }
      if (progress < 2) frame = requestAnimationFrame(animate);
      else setPlaying(false);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [playing, reduced]);
  function choose(id: SpatialId) {
    setScene(id);
    setPlaying(false);
    setExtraKm(0);
    setTime(2);
    setUnavailable(false);
    setEvaluate(false);
    setCameraRequest((request) => ({
      view: "follow",
      revision: request.revision + 1,
      targetId: "all",
    }));
    window.history.replaceState(null, "", `/design/spatial?scene=${id}`);
  }
  function camera(view: CameraView, targetId = "all") {
    setCameraRequest((request) => ({
      view,
      targetId,
      revision: request.revision + 1,
    }));
  }
  function milestone(value: number) {
    setPlaying(false);
    setTime(value);
    setExtraKm(0);
  }
  const flatProps = {
    time,
    extraKm,
    unit,
    selected,
    showGhost,
    onSelect: setSelected,
  };
  const isWorld =
    scene === "pursuit" || scene === "circuit" || scene === "switchback";
  return (
    <div className="spatial-lab">
      <header className="spatial-review-bar">
        <Link href="/design">← Brand / UX study</Link>
        <span>SPATIAL COMPARISONS</span>
        <button aria-expanded={evaluate} onClick={() => setEvaluate((v) => !v)}>
          {evaluate ? "Back to the field" : "Compare the concepts"} ↗
        </button>
      </header>
      <nav className="spatial-directions" aria-label="Spatial concept">
        {spatialIds.map((id) => (
          <button
            key={id}
            aria-pressed={scene === id}
            onClick={() => choose(id)}
          >
            <span>{spatialDirections[id].label.split(" / ")[0]}</span>
            {spatialDirections[id].name}
          </button>
        ))}
      </nav>
      {evaluate ? (
        <section className="spatial-evaluation">
          <p className="spatial-kicker">
            Different mechanisms / Design hypotheses
          </p>
          <h1>
            Make the gap
            <br />
            <em>mean something.</em>
          </h1>
          <div className="spatial-evaluation-grid">
            {spatialIds.map((id) => (
              <article key={id}>
                <span>{spatialDirections[id].name}</span>
                <h2>{spatialDirections[id].headline}</h2>
                <p>{spatialDirections[id].mechanism}</p>
                <dl>
                  <div>
                    <dt>What it should win at</dt>
                    <dd>{spatialDirections[id].advantage}</dd>
                  </div>
                  <div>
                    <dt>Where it can mislead</dt>
                    <dd>{spatialDirections[id].risk}</dd>
                  </div>
                  <div>
                    <dt>Test this</dt>
                    <dd>{spatialDirections[id].test}</dd>
                  </div>
                </dl>
                <button onClick={() => choose(id)}>
                  Explore {spatialDirections[id].name} ↗
                </button>
              </article>
            ))}
          </div>
          <p className="spatial-recommendation">
            Leading combination: Pursuit for the feeling, Distance path for the
            exact gap, Week replay for the evidence. Circuit and Switchback test
            two more playful spatial worlds.
          </p>
        </section>
      ) : (
        <section className={`spatial-app spatial-${scene}`} data-scene={scene}>
          <header className="field-header">
            <button
              className="field-wordmark"
              onClick={() => choose("pursuit")}
            >
              FIELD<span>↗</span>
            </button>
            <div>
              <span>RUNNING / WEEKLY DISTANCE</span>
              <button
                aria-pressed={unit === "km"}
                onClick={() => setUnit("km")}
              >
                km
              </button>
              <button
                aria-pressed={unit === "mi"}
                onClick={() => setUnit("mi")}
              >
                mi
              </button>
            </div>
          </header>
          <div className="spatial-heading">
            <div>
              <p className="spatial-kicker">{direction.label}</p>
              <h1>{direction.headline}</h1>
            </div>
            <div className="your-distance">
              <strong>
                {formatDistance(you, unit)}
                <small>{unit}</small>
              </strong>
              <span>
                {extraKm > 0 ? "WHAT-IF TOTAL" : "YOUR WEEK"} · {place}
                {place === 1
                  ? "st"
                  : place === 2
                    ? "nd"
                    : place === 3
                      ? "rd"
                      : "th"}{" "}
                / 12
              </span>
            </div>
          </div>
          <div className="spatial-status">
            <span>{cutoffLabel(time)}</span>
            <span>Sample week / Oct 12–19, 2026 / UTC</span>
            <span className={extraKm > 0 ? "preview-status" : ""}>
              {extraKm > 0
                ? `Preview +${formatDistance(extraKm, unit)} ${unit}`
                : "Accumulated activity · Not live location"}
            </span>
          </div>
          <div className="spatial-workspace">
            <div className="scene-column">
              <div className="scene-control-bar">
                <span>
                  {isWorld && !unavailable
                    ? "3D WORLD"
                    : "PROPORTIONAL DISTANCE"}
                </span>
                <div>
                  {isWorld && !unavailable && (
                    <>
                      <button
                        aria-pressed={cameraRequest.view === "follow"}
                        onClick={() => camera("follow")}
                      >
                        {scene === "pursuit" ? "POV" : "Orbit view"}
                      </button>
                      <button
                        aria-pressed={cameraRequest.view === "behind"}
                        onClick={() => camera("behind")}
                      >
                        {scene === "pursuit" ? "Look behind" : "Other side"}
                      </button>
                      <button
                        aria-pressed={cameraRequest.view === "above"}
                        onClick={() => camera("above")}
                      >
                        From above
                      </button>
                    </>
                  )}
                  <button
                    aria-pressed={showGhost}
                    onClick={() => {
                      if (showGhost && selected === "ghost") setSelected("you");
                      setShowGhost((v) => !v);
                    }}
                  >
                    {showGhost ? "Hide past you" : "Add past you"}
                  </button>
                </div>
              </div>
              <div className="scene-stage">
                {isWorld && !unavailable ? (
                  <World
                    key={scene}
                    mode={scene}
                    {...flatProps}
                    cameraRequest={cameraRequest}
                    onUnavailable={() => setUnavailable(true)}
                  />
                ) : scene === "replay" ? (
                  <ReplayLanes {...flatProps} />
                ) : (
                  <DistancePath {...flatProps} />
                )}
                {unavailable && (
                  <div className="gpu-fallback" role="status">
                    3D is unavailable here. The exact distance path remains
                    interactive.
                    <button onClick={() => setUnavailable(false)}>
                      Try 3D again
                    </button>
                  </div>
                )}
              </div>
              <div className="scene-legend">
                <span>
                  <i className="legend-you" />
                  Your week
                </span>
                <span>
                  <i className="legend-selected" />
                  Selected rival
                </span>
                {showGhost && (
                  <span>
                    <i className="legend-ghost" />
                    Previous-week ghost
                  </span>
                )}
                <span>
                  {unavailable
                    ? "Distance sets position, not rank"
                    : scene === "circuit"
                      ? `Each virtual lap = ${formatDistance(lapKm, unit)} ${unit}`
                      : scene === "switchback"
                        ? "Synthetic course · Reference length 30 km"
                        : isWorld
                          ? "Drag to look / orbit · Pinch or scroll to zoom"
                          : "Distance sets position, not rank"}
                </span>
              </div>
              <div className="replay-controls">
                <div className="replay-label">
                  <label htmlFor="spatial-time">
                    Rewind the imported milestones
                  </label>
                  <button
                    onClick={() => {
                      if (playing) {
                        setPlaying(false);
                      } else {
                        setExtraKm(0);
                        setTime(0);
                        setPlaying(true);
                      }
                    }}
                  >
                    {playing
                      ? "Pause replay"
                      : reduced
                        ? "Play milestones"
                        : "Play week replay"}{" "}
                    {playing ? "Ⅱ" : "▷"}
                  </button>
                </div>
                <input
                  id="spatial-time"
                  type="range"
                  aria-label="Replay milestone"
                  aria-valuetext={cutoffLabel(time)}
                  min="0"
                  max="2"
                  step="0.01"
                  value={time}
                  onChange={(e) => {
                    setPlaying(false);
                    setTime(Number(e.target.value));
                    setExtraKm(0);
                  }}
                />
                <div className="milestone-buttons">
                  {["Monday", "Tuesday", "Thursday"].map((day, i) => (
                    <button
                      key={day}
                      aria-pressed={time === i}
                      onClick={() => milestone(i)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                {scene === "replay" && (
                  <div className="replay-insight" aria-live="polite">
                    {extraKm > 0
                      ? "A what-if total, not a recorded pass."
                      : Math.abs(time - 1) < 0.005
                        ? "Tuesday: your 7.1 km import took you 0.6 km ahead of Maya."
                        : Math.abs(time - 2) < 0.005
                          ? "Thursday: Maya’s total moved 0.9 km ahead. Your 6.2 km import brought you to 19.2 km."
                          : Math.abs(time) < 0.005
                            ? "Monday: your first 5.9 km arrived. You began fifth in this field."
                            : "Interpolating the milestone totals. This is not GPS or simultaneous activity."}
                  </div>
                )}
              </div>
            </div>
            <aside
              className="spatial-inspector"
              aria-live={!playing && Number.isInteger(time) ? "polite" : "off"}
            >
              <p className="spatial-kicker">Selected in the field</p>
              <span
                className={`inspector-avatar ${person.you ? "inspector-you" : ""}`}
              >
                {person.initials}
              </span>
              <h2>{person.name}</h2>
              <strong className="inspector-total">
                {formatDistance(selectedDistance, unit)}
                <small>{unit}</small>
              </strong>
              <p className="inspector-gap">
                {formatGap(person, time, extraKm, unit)}
              </p>
              <dl>
                <div>
                  <dt>{person.ghost ? "Reference" : "Distance rank"}</dt>
                  <dd>
                    {person.ghost
                      ? "Past week"
                      : `${rankAt(person.id, time, extraKm)} / 12`}
                  </dd>
                </div>
                <div>
                  <dt>Comparison</dt>
                  <dd>Same cutoff</dd>
                </div>
                {scene === "circuit" && (
                  <div>
                    <dt>Virtual progress</dt>
                    <dd>
                      {Math.floor(selectedDistance / lapKm)} laps +{" "}
                      {formatDistance(selectedDistance % lapKm, unit)} {unit}
                    </dd>
                  </div>
                )}
              </dl>
              <button
                className="inspector-primary"
                onClick={() => setReceipt(true)}
              >
                Open the distance receipt ↗
              </button>
              {isWorld && !unavailable && (
                <button
                  className="inspector-link"
                  onClick={() => camera(cameraRequest.view, selected)}
                >
                  Focus this runner ↗
                </button>
              )}
              <div className="distance-preview">
                <label htmlFor="spatial-extra">
                  What if you added distance?
                  <strong>
                    +{formatDistance(extraKm, unit)} {unit}
                  </strong>
                </label>
                <input
                  id="spatial-extra"
                  aria-label="Preview extra distance"
                  aria-valuetext={`${formatDistance(extraKm, unit)} ${unit} hypothetical distance`}
                  type="range"
                  min="0"
                  max="8"
                  step="0.1"
                  value={extraKm}
                  onChange={(e) => {
                    setPlaying(false);
                    setExtraKm(Number(e.target.value));
                  }}
                />
                <p>
                  {extraKm > 0
                    ? `Preview place: ${place} / 12. Recorded snapshot: ${baselinePlace} / 12.`
                    : "Move the slider to explore a pass. This never logs a workout."}
                </p>
                <button disabled={extraKm === 0} onClick={() => setExtraKm(0)}>
                  Reset what-if
                </button>
              </div>
            </aside>
          </div>
          <section className="spatial-nearby">
            <div className="nearby-heading">
              <h2>The exact field</h2>
              <span>
                {time === 2 ? "Thursday snapshot" : "Replay cutoff"} / {unit} /{" "}
                {extraKm > 0 ? "WHAT-IF" : "SAMPLE DATA"}
              </span>
            </div>
            <div className="nearby-runners">
              {orderedAt(time, extraKm).map((runner) => (
                <button
                  key={runner.id}
                  className={`${runner.you ? "nearby-you" : ""} ${selected === runner.id ? "nearby-selected" : ""}`}
                  onClick={() => setSelected(runner.id)}
                >
                  <span>{rankAt(runner.id, time, extraKm)}</span>
                  <div>
                    <strong>{runner.name}</strong>
                    <small>{formatGap(runner, time, extraKm, unit)}</small>
                  </div>
                  <b>
                    {formatDistance(distanceAt(runner, time, extraKm), unit)}
                    <small>{unit}</small>
                  </b>
                </button>
              ))}
            </div>
          </section>
          <details className="spatial-design-notes">
            <summary>Why this is a different interaction model</summary>
            <p>{direction.mechanism}</p>
            <p>
              <strong>Strength:</strong> {direction.advantage}
            </p>
            <p>
              <strong>Watch for:</strong> {direction.risk}
            </p>
            <p>
              <strong>Evaluate:</strong> {direction.test}
            </p>
          </details>
          <dialog
            ref={dialog}
            className="spatial-receipt"
            onCancel={() => setReceipt(false)}
            onClose={() => setReceipt(false)}
            aria-labelledby="spatial-receipt-title"
          >
            <div>
              <h2 id="spatial-receipt-title">
                {person.name} / Distance receipt
              </h2>
              <button
                aria-label="Close distance receipt"
                onClick={() => setReceipt(false)}
              >
                ×
              </button>
            </div>
            <p className="spatial-kicker">
              Sample weekly distance / Same replay cutoff
            </p>
            <strong>
              {formatDistance(selectedDistance, unit)} {unit}
            </strong>
            <p>
              {formatGap(person, time, extraKm, unit)}.{" "}
              {extraKm > 0 && person.you
                ? "Includes hypothetical extra distance, not a recorded activity."
                : "Based on presentation fixtures, not an authorized tracker connection."}
            </p>
            <ul>
              {person.km.map((km, i) => (
                <li key={i}>
                  <span>{["Monday", "Tuesday", "Thursday"][i]}</span>
                  <b>
                    {formatDistance(km, unit)} {unit} cumulative
                  </b>
                </li>
              ))}
            </ul>
            {person.you && (
              <p>
                Counted sample imports: Monday 5.9 km; Tuesday 7.1 km; Thursday
                6.2 km. Thursday total: 19.2 km.
              </p>
            )}
            <p>
              Default weekly bounds remain Monday 00:00 to next Monday 00:00
              UTC. These distance comparisons do not change production effort
              scores or Elo.
            </p>
            <button className="receipt-done" onClick={() => setReceipt(false)}>
              Return to the field ↗
            </button>
          </dialog>
        </section>
      )}
      <footer className="spatial-footer">
        <Link href="/design/evolution?brand=volt&view=field&mode=pursuit">
          Third-person Pursuit and the nine-lane track ↗
        </Link>
        Public presentation prototype · Synthetic distance and scenery · No live
        GPS, workout logging, or tracker writes
      </footer>
    </div>
  );
}
