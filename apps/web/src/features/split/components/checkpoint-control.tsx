"use client";

import type { CheckpointIndex } from "@fitness-battle/shared";

export function CheckpointControl({
  checkpoint,
  labels,
  onChange,
}: {
  checkpoint: CheckpointIndex;
  labels: [string, string, string];
  onChange: (value: CheckpointIndex) => void;
}) {
  return (
    <div className="sp-checkpoint">
      <label htmlFor="sp-checkpoint">
        <span>Rewind the week</span>
        <strong>{labels[checkpoint]}</strong>
      </label>
      <input
        id="sp-checkpoint"
        aria-label="Activity checkpoint"
        type="range"
        min={0}
        max={2}
        step={1}
        value={checkpoint}
        onChange={(event) =>
          onChange(Number(event.target.value) as CheckpointIndex)
        }
      />
      <div className="sp-checkpoint-days">
        {labels.map((label, index) => (
          <span key={`${index}-${label}`}>{label}</span>
        ))}
      </div>
    </div>
  );
}
