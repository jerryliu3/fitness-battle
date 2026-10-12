"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { FieldRoster } from "@/features/split/components/field-roster";
import { DistancePath } from "./distance-path";
import {
  distanceAt,
  formatGapLabel,
  formatKm,
  orderedRunners,
  type FieldModel,
  type FieldViewMode,
  type PursuitFacing,
} from "../model";
import type { BoardRow } from "@fitness-battle/shared";

const PursuitScene = dynamic(
  () => import("./pursuit-scene").then((mod) => mod.PursuitScene),
  {
    ssr: false,
    loading: () => (
      <div className="fd-loading">
        <span />
        Building your distance field…
      </div>
    ),
  },
);

export function FieldStage({
  model,
  checkpoint = 2,
  boardRows,
}: {
  model: FieldModel;
  checkpoint?: number;
  /** Prefer live board rows so rating/distance stay accurate in the list. */
  boardRows?: BoardRow[];
}) {
  const you = model.you;
  const [view, setView] = useState<FieldViewMode>("pursuit");
  const [facing, setFacing] = useState<PursuitFacing>("forward");
  const [zoom, setZoom] = useState(0.35);
  const [showGhost, setShowGhost] = useState(Boolean(model.ghost));
  const [selectedId, setSelectedId] = useState(
    you
      ? orderedRunners(model.runners, checkpoint).find((r) => !r.you)?.id ??
          you.id
      : model.runners[0]?.id ?? "",
  );
  const [webglOk, setWebglOk] = useState(true);

  const unitLabel = model.gps ? "km" : "pts";
  const selected =
    model.runners.find((runner) => runner.id === selectedId) ??
    (model.ghost?.id === selectedId ? model.ghost : null);

  const rosterRows: BoardRow[] = useMemo(() => {
    if (boardRows?.length) {
      const byId = new Map(boardRows.map((row) => [row.id, row]));
      return orderedRunners(model.runners, checkpoint).map((runner, index) => {
        const row = byId.get(runner.id);
        return {
          id: runner.id,
          name: row?.name ?? runner.name,
          elo: row?.elo ?? 0,
          effort: row?.effort ?? runner.effort,
          distanceM: row?.distanceM ?? runner.km[2]! * 1000,
          movingSec: row?.movingSec ?? 0,
          you: Boolean(runner.you),
          place: index + 1,
        };
      });
    }
    return orderedRunners(model.runners, checkpoint).map((runner, index) => ({
      id: runner.id,
      name: runner.name,
      elo: 0,
      effort: runner.effort,
      distanceM: runner.km[2]! * 1000,
      movingSec: 0,
      you: Boolean(runner.you),
      place: index + 1,
    }));
  }, [boardRows, model.runners, checkpoint]);

  if (!you) {
    return (
      <div className="sp-empty">
        <h2>Join the field to see gaps</h2>
        <p className="fb-copy">
          Pursuit and the bird’s-eye path need your place in this week’s matched
          group.
        </p>
      </div>
    );
  }

  const activeView = view === "pursuit" && !webglOk ? "path" : view;
  const selectedRunner =
    selected && "km" in selected
      ? selected
      : model.runners.find((runner) => runner.id === selectedId) ?? you;

  return (
    <section className="fd-stage">
      <div className="fd-view-switch" role="tablist" aria-label="Field view">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "pursuit"}
          disabled={!webglOk && view === "pursuit"}
          onClick={() => {
            setView("pursuit");
            setWebglOk(true);
          }}
        >
          POV pursuit
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "path"}
          onClick={() => setView("path")}
        >
          Bird’s-eye path
        </button>
      </div>

      {activeView === "pursuit" ? (
        <>
          <div className="fd-scene-frame">
            <PursuitScene
              runners={model.runners}
              you={you}
              ghost={model.ghost}
              checkpoint={checkpoint}
              selectedId={selectedId}
              facing={facing}
              zoom={zoom}
              unitLabel={unitLabel}
              showGhost={showGhost}
              onSelect={setSelectedId}
              onUnavailable={() => {
                setWebglOk(false);
                setView("path");
              }}
            />
          </div>
          <div className="fd-controls">
            <label>
              <span>Zoom · forward / back</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={zoom}
                aria-valuetext={zoom < 0.33 ? "Close" : zoom > 0.66 ? "Far" : "Mid"}
                onChange={(event) => setZoom(Number(event.target.value))}
              />
            </label>
            <div className="fd-facing">
              <button
                type="button"
                aria-pressed={facing === "forward"}
                onClick={() => setFacing("forward")}
              >
                Look ahead
              </button>
              <button
                type="button"
                aria-pressed={facing === "behind"}
                onClick={() => setFacing("behind")}
              >
                Turn around
              </button>
              {model.ghost ? (
                <button
                  type="button"
                  aria-pressed={showGhost}
                  onClick={() => setShowGhost((value) => !value)}
                >
                  {showGhost ? "Hide ghost" : "Show ghost"}
                </button>
              ) : null}
            </div>
          </div>
          {!webglOk ? (
            <p className="fd-note">
              3D pursuit needs WebGL. Showing the bird’s-eye path instead.
            </p>
          ) : (
            <p className="fd-note">
              POV from your week · gaps are weekly {unitLabel}, not live GPS ·
              use the sliders (no drag gestures)
            </p>
          )}
        </>
      ) : (
        <DistancePath
          runners={model.runners}
          you={you}
          referenceKm={model.referenceKm}
          checkpoint={checkpoint}
          selectedId={selectedId}
          unitLabel={unitLabel}
          onSelect={setSelectedId}
        />
      )}

      <aside className="fd-inspector" aria-live="polite">
        <p className="fb-kicker">Selected in the field</p>
        <h2>{selectedRunner.you ? "You" : selectedRunner.name}</h2>
        <strong>
          {formatKm(distanceAt(selectedRunner, checkpoint))}
          <small> {unitLabel}</small>
        </strong>
        <p>
          {formatGapLabel(selectedRunner, you, checkpoint, unitLabel)}
          {" · "}
          place {selectedRunner.place || "—"}
        </p>
      </aside>

      <div>
        <div className="fd-roster-head">
          <h3>Exact field</h3>
          <span>
            {model.checkpointLabels[Math.min(2, Math.floor(checkpoint))]} ·{" "}
            {unitLabel}
          </span>
        </div>
        <FieldRoster
          rows={rosterRows}
          selectedId={selectedId}
          onSelect={setSelectedId}
          detail={model.gps ? "distance" : "rating"}
        />
      </div>
    </section>
  );
}
