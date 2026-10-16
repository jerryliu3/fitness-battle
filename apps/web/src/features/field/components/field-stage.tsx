"use client";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  fitArenaWindow,
  type ArenaSceneLane,
  type ArenaViewWindow,
  type BoardRow,
} from "@fitness-battle/shared";
import { ArenaLanes } from "@/features/focus/arena-lanes";
import { Sheet } from "@/ui/sheet";
import { defaultLook } from "../avatar";
import {
  gapLabel,
  placeAt,
  stableLanes,
  valueAt,
  type SceneRunner,
} from "../geometry";
import type { FieldModel } from "../model";
const LivePursuit = dynamic(
  () => import("./live-pursuit").then((m) => m.LivePursuit),
  {
    ssr: false,
    loading: () => <div className="fd-loading">Preparing your lanes…</div>,
  },
);
export function FieldStage({
  model,
  boardRows,
}: {
  model: FieldModel;
  boardRows?: BoardRow[];
}) {
  const unit = model.gps ? "km" : "pts";
  const runners = useMemo<SceneRunner[]>(
    () =>
      model.runners.map((r) => ({
        id: r.id,
        name: r.name,
        initials: r.initials,
        series: [0, ...r.km],
        you: r.you,
      })),
    [model.runners],
  );
  const time = Math.max(
    0,
    (runners.find((r) => r.you)?.series.length ?? 1) - 1,
  );
  const you = runners.find((r) => r.you);
  const total = you ? valueAt(you, time) : 0;
  const ghost: SceneRunner | null = model.ghost
    ? {
        id: model.ghost.id,
        name: model.ghost.name,
        initials: model.ghost.initials,
        series: [0, ...model.ghost.km],
        ghost: true,
      }
    : null;
  const [mode, setMode] = useState<"lanes" | "pursuit">("lanes");
  const [camera, setCamera] = useState<"above" | "follow">("above");
  const [span, setSpan] = useState(model.gps ? 6 : 20);
  const [center, setCenter] = useState<number | null>(null);
  const [showGhost, setShowGhost] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const view: ArenaViewWindow = { center: center ?? total, span };
  const sceneLanes: ArenaSceneLane[] = [
    ...runners,
    ...(showGhost && ghost ? [ghost] : []),
  ].map((r) => ({
    id: r.id,
    name: r.name,
    initials: r.initials,
    value: valueAt(r, time),
    you: r.you,
    ghost: r.ghost,
  }));
  const chosen =
    selected === ghost?.id && showGhost
      ? ghost
      : runners.find((r) => r.id === selected);
  if (!you) return <p className="fb-copy">Join a field to see your lanes.</p>;
  return (
    <section className="focus-arena-stage">
      <div className="focus-arena-total">
        <div>
          <p className="fb-kicker">Your week in motion</p>
          <strong>
            {total.toFixed(1)}
            <small>{unit}</small>
          </strong>
        </div>
        <span className="focus-status">
          {placeAt(runners, you.id, time, 0)} / {runners.length}
          <small>your place</small>
        </span>
      </div>
      {ghost && (
        <p className="focus-gain">
          {total - valueAt(ghost, time) >= 0 ? "+" : ""}
          {(total - valueAt(ghost, time)).toFixed(1)} {unit} vs past you · same
          cutoff
        </p>
      )}
      <div className="focus-segments" role="tablist" aria-label="Arena view">
        {(["lanes", "pursuit"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setUnavailable(false);
            }}
          >
            {m === "lanes" ? "2D lanes" : "3D pursuit"}
          </button>
        ))}
      </div>
      <div className="focus-track-frame">
        {mode === "pursuit" && !unavailable ? (
          <>
            <LivePursuit
              runners={stableLanes(runners)}
              ghost={ghost}
              time={time}
              extra={0}
              selected={selected ?? you.id}
              showGhost={showGhost}
              camera={camera}
              look={defaultLook}
              unit={unit}
              view={view}
              onPan={(v) => setCenter(Math.max(0, v))}
              onSelect={setSelected}
              onUnavailable={() => setUnavailable(true)}
            />
            <div className="focus-camera">
              <button
                onClick={() =>
                  setCamera(camera === "above" ? "follow" : "above")
                }
              >
                {camera === "above" ? "Follow camera ↗" : "Above camera ↗"}
              </button>
            </div>
          </>
        ) : (
          <ArenaLanes
            lanes={sceneLanes}
            view={view}
            unit={unit}
            selected={selected ?? you.id}
            onSelect={setSelected}
            onPan={(v) => setCenter(Math.max(0, v))}
          />
        )}
        {unavailable && (
          <p className="fb-note">
            3D is unavailable on this device. Your 2D lanes remain interactive.
          </p>
        )}
      </div>
      <div className="focus-track-controls">
        <button
          aria-label="Zoom in"
          disabled={span <= 1}
          onClick={() => setSpan(Math.max(1, span / 1.5))}
        >
          ＋
        </button>
        <button
          aria-label="Zoom out"
          disabled={span >= 5000}
          onClick={() => setSpan(Math.min(5000, span * 1.5))}
        >
          −
        </button>
        <button
          aria-label="Move window backward"
          onClick={() => setCenter(Math.max(0, view.center - span / 3))}
        >
          ↓
        </button>
        <button
          aria-label="Move window forward"
          onClick={() => setCenter(view.center + span / 3)}
        >
          ↑
        </button>
        <button
          onClick={() => {
            setCenter(null);
            setSpan(model.gps ? 6 : 20);
          }}
        >
          Center me
        </button>
        <button
          onClick={() => {
            const fit = fitArenaWindow(sceneLanes);
            setCenter(fit.center);
            setSpan(fit.span);
          }}
        >
          Fit field
        </button>
      </div>
      <div className="focus-track-caption">
        <span>
          ± {(span / 2).toFixed(1)} {unit} around{" "}
          {center === null ? "you" : view.center.toFixed(1)}
        </span>
        {ghost && (
          <label>
            <input
              type="checkbox"
              checked={showGhost}
              onChange={(e) => {
                const next = e.target.checked;
                setShowGhost(next);
                if (!next && selected === ghost?.id) setSelected(null);
              }}
            />{" "}
            Past you
          </label>
        )}
      </div>
      <details className="focus-disclosure">
        <summary>
          Full standings <span>＋</span>
        </summary>
        <div className="focus-standings">
          {[...runners]
            .sort((a, b) => valueAt(b, time) - valueAt(a, time))
            .map((r) => (
              <button key={r.id} onClick={() => setSelected(r.id)}>
                <span>{placeAt(runners, r.id, time, 0)}</span>
                <b>{r.you ? "You" : r.name}</b>
                <small>
                  {boardRows?.find((row) => row.id === r.id)?.elo ?? "—"} Elo
                </small>
                <strong>
                  {valueAt(r, time).toFixed(1)} {unit}
                </strong>
              </button>
            ))}
        </div>
      </details>
      <p className="fb-note">
        Lanes show accumulated activity, not live GPS positions. Practice fields
        may contain synthetic athletes.
      </p>
      <Sheet
        open={!!chosen}
        title={chosen?.you ? "Your position" : (chosen?.name ?? "Athlete")}
        body={
          chosen
            ? `${valueAt(chosen, time).toFixed(1)} ${unit} · ${gapLabel(chosen, you, time, 0, unit)}${chosen.ghost ? " · comparison only, not ranked" : ""}`
            : ""
        }
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
