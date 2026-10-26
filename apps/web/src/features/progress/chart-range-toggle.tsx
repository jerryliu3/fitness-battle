"use client";
import { TRAINING_CHART_RANGE_OPTIONS, type TrainingRange } from "@fitness-battle/shared";

export function ChartRangeToggle({
  value,
  onChange,
}: {
  value: TrainingRange;
  onChange: (range: TrainingRange) => void;
}) {
  return (
    <div
      className="chart-range-toggle"
      role="group"
      aria-label="Training chart range"
    >
      {TRAINING_CHART_RANGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          aria-label={option.ariaLabel}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
