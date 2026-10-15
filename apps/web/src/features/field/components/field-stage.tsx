"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { FieldRoster } from "@/features/split/components/field-roster";
import { defaultLook, kits, skins, type HairId, type KitId, type SkinId } from "../avatar";
import {
  gapLabel,
  placeAt,
  stableLanes,
  valueAt,
  type SceneRunner,
} from "../geometry";
import { LaneTrack } from "./lane-track";
import type { FieldModel } from "../model";
import type { BoardRow } from "@fitness-battle/shared";

const LivePursuit = dynamic(
  () => import("./live-pursuit").then((mod) => mod.LivePursuit),
  {
    ssr: false,
    loading: () => <div className="fd-loading">Preparing the track…</div>,
  },
);

type Mode = "lanes" | "pursuit";
type CameraMode = "follow" | "above" | "avatar";

function toRunner(
  id: string,
  name: string,
  initials: string,
  km: readonly number[],
  flags: { you?: boolean; ghost?: boolean } = {},
): SceneRunner {
  return {
    id,
    name,
    initials,
    series: [0, ...km],
    ...flags,
  };
}

export function FieldStage({
  model,
  boardRows,
  chrome = "legacy",
}: {
  model: FieldModel;
  checkpoint?: number;
  boardRows?: BoardRow[];
  /** Shell chrome is the gain line, switch, and replay around the same renders. */
  chrome?: "legacy" | "shell";
}) {
  const you = model.you;
  const unit = model.gps ? "km" : "pts";
  const runners = useMemo(
    () =>
      model.runners.map((runner) =>
        toRunner(runner.id, runner.name, runner.initials, runner.km, {
          you: runner.you,
        }),
      ),
    [model.runners],
  );
  const ghost = model.ghost
    ? toRunner(model.ghost.id, model.ghost.name, model.ghost.initials, model.ghost.km, {
        ghost: true,
      })
    : null;
  const lanes = stableLanes(runners);
  const youRunner = lanes.find((runner) => runner.you) ?? null;
  const maxTime = Math.max(0, (youRunner?.series.length ?? 1) - 1);
  const [mode, setMode] = useState<Mode>("lanes");
  const [time, setTime] = useState(maxTime);
  const [camera, setCamera] = useState<CameraMode>("follow");
  const [showGhost, setShowGhost] = useState(Boolean(ghost));
  const [selectedId, setSelectedId] = useState(you?.id ?? runners[0]?.id ?? "");
  const [extra, setExtra] = useState(0);
  const [look, setLook] = useState(defaultLook);
  const [unavailable, setUnavailable] = useState(false);
  const rawLabels = ["Start", ...model.checkpointLabels];
  const labels =
    new Set(model.checkpointLabels).size === 1
      ? ["Start", "Early", "Mid", "Now"]
      : rawLabels;

  const selected =
    (selectedId === ghost?.id ? ghost : runners.find((runner) => runner.id === selectedId)) ??
    youRunner;

  const rosterRows: BoardRow[] = useMemo(() => {
    const ordered = [...runners].sort(
      (a, b) => valueAt(b, time, extra) - valueAt(a, time, extra) || a.id.localeCompare(b.id),
    );
    return ordered.map((runner) => {
      const row = boardRows?.find((item) => item.id === runner.id);
      return {
        id: runner.id,
        name: row?.name ?? runner.name,
        elo: row?.elo ?? 0,
        effort: valueAt(runner, time, extra),
        distanceM: row?.distanceM ?? valueAt(runner, time, extra) * (model.gps ? 1000 : 1),
        movingSec: row?.movingSec ?? 0,
        you: Boolean(runner.you),
        place: placeAt(runners, runner.id, time, extra),
      };
    });
  }, [boardRows, extra, model.gps, runners, time]);

  if (!you || !youRunner || !selected) {
    return (
      <div className="sp-empty">
        <h2>Join the field to see the track</h2>
        <p className="fb-copy">
          The 2D lanes and 3D pursuit need your place in this week’s group.
        </p>
      </div>
    );
  }

  const sceneKey = lanes.map((runner) => runner.id).join(":");

  return (
    <section className="fd-stage">
      {chrome === "shell" ? (
        <div className="track-gain">
          <strong>
            {valueAt(youRunner, time, extra).toFixed(1)}
            <small>{unit}</small>
          </strong>
          <span>
            {ghost && showGhost
              ? `${(valueAt(youRunner, time, extra) - valueAt(ghost, time, 0) >= 0 ? "+" : "")}${(valueAt(youRunner, time, extra) - valueAt(ghost, time, 0)).toFixed(1)} ${unit} vs ${ghost.name.toLowerCase()}`
              : `${placeAt(runners, youRunner.id, time, extra)} / ${runners.length}`}
          </span>
        </div>
      ) : (
        <div className="fd-field-head">
          <div>
            <p className="fb-kicker">
              {mode === "lanes" ? "A track you can read" : "A world you move through"}
            </p>
            <h2>The field.</h2>
          </div>
          <div className="fd-readout">
            <strong>
              {valueAt(youRunner, time, extra).toFixed(1)}
              <small>{unit}</small>
            </strong>
            <span>
              {extra > 0 ? "What-if" : model.gps ? "By distance" : "By effort"} ·{" "}
              {placeAt(runners, youRunner.id, time, extra)} / {runners.length}
            </span>
          </div>
        </div>
      )}

      <div
        className={chrome === "shell" ? "fd-view-switch track-switch" : "fd-view-switch"}
        role="tablist"
        aria-label="Field view"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "lanes"}
          onClick={() => setMode("lanes")}
        >
          2D lanes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "pursuit"}
          onClick={() => {
            setUnavailable(false);
            setMode("pursuit");
          }}
        >
          3D Pursuit
        </button>
      </div>

      <div className="fd-field-layout">
        <div className="fd-scene-frame">
          {mode === "pursuit" && !unavailable ? (
            <>
              <div className="fd-camera">
                {(["follow", "above", "avatar"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={camera === id}
                    onClick={() => setCamera(id)}
                  >
                    {id === "follow" ? "Follow" : id === "above" ? "Above" : "Avatar"}
                  </button>
                ))}
              </div>
              <LivePursuit
                key={sceneKey}
                runners={lanes}
                ghost={ghost}
                time={time}
                extra={extra}
                selected={selectedId}
                showGhost={showGhost}
                camera={camera}
                look={look}
                unit={unit}
                onSelect={setSelectedId}
                onUnavailable={() => setUnavailable(true)}
              />
            </>
          ) : (
            <LaneTrack
              runners={lanes}
              ghost={ghost}
              time={time}
              extra={extra}
              selected={selectedId}
              showGhost={showGhost}
              unit={unit}
              onSelect={setSelectedId}
            />
          )}
          {unavailable ? (
            <p className="fb-note">3D is unavailable here. The 2D track stays interactive.</p>
          ) : null}
          <div className={chrome === "shell" ? "fd-replay track-replay" : "fd-replay"}>
            <label htmlFor="field-replay">Rewind the week</label>
            <input
              id="field-replay"
              type="range"
              min={0}
              max={maxTime}
              step={0.01}
              value={time}
              aria-valuetext={labels[Math.round(time)] ?? "Replay"}
              onChange={(event) => setTime(Number(event.target.value))}
            />
            <div>
              {labels.map((label, index) => (
                <button
                  key={`${label}-${index}`}
                  type="button"
                  aria-pressed={time === index}
                  onClick={() => setTime(index)}
                >
                  {index === 0 ? "Start" : label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="fd-inspector">
          <p className="fb-kicker">Selected runner</p>
          <h3>{selected.name}</h3>
          <strong>
            {valueAt(selected, time, extra).toFixed(1)} <small>{unit}</small>
          </strong>
          <p>{gapLabel(selected, youRunner, time, extra, unit)}</p>
          <p className="fb-note">
            {selected.you
              ? "Your line uses imported activity through each cutoff."
              : "Other lanes share this week’s total, spread across the same cutoffs. That is not a GPS trace."}
          </p>
          <button
            type="button"
            className="fb-btn-line"
            aria-pressed={showGhost}
            onClick={() => setShowGhost((value) => !value)}
            disabled={!ghost}
          >
            {showGhost ? "Hide past you" : "Add past you"}
          </button>
          <label className="fb-field">
            What if you added {unit}?
            <strong>+{extra.toFixed(1)}</strong>
            <input
              type="range"
              min={0}
              max={model.gps ? 20 : 30}
              step={0.1}
              value={extra}
              aria-label="Hypothetical addition"
              onChange={(event) => setExtra(Number(event.target.value))}
            />
          </label>
          <button type="button" className="fb-btn-ghost" disabled={extra === 0} onClick={() => setExtra(0)}>
            Reset preview
          </button>
          {mode === "pursuit" && !unavailable ? (
            <details>
              <summary>Your runner’s look</summary>
              <div className="fd-looks">
                {(Object.keys(kits) as KitId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    style={{ background: kits[id] }}
                    aria-label={`${id} kit`}
                    aria-pressed={look.kit === id}
                    onClick={() => setLook({ ...look, kit: id })}
                  />
                ))}
                {(Object.keys(skins) as SkinId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    style={{ background: skins[id] }}
                    aria-label={`${id} skin tone`}
                    aria-pressed={look.skin === id}
                    onClick={() => setLook({ ...look, skin: id })}
                  />
                ))}
                {(["crop", "bun", "cap"] as HairId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={look.hair === id}
                    onClick={() => setLook({ ...look, hair: id })}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </details>
          ) : null}
        </aside>
      </div>

      <FieldRoster
        rows={rosterRows}
        selectedId={selectedId}
        onSelect={setSelectedId}
        unit={unit}
        ghost={
          showGhost && ghost
            ? {
                id: ghost.id,
                name: ghost.name,
                effort: valueAt(ghost, time, 0),
                detail: "Past you · not ranked",
              }
            : null
        }
      />
    </section>
  );
}
