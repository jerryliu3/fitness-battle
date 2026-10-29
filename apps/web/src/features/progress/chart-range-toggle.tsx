"use client";
import { OPEN_LINE_RANGES, TRAINING_CHART_RANGE_OPTIONS, type OpenLineRange, type TrainingRange } from "@fitness-battle/shared";

export function OpenLineRangeToggle({ value, onChange, includeYear = true }: { value: OpenLineRange; onChange: (range: OpenLineRange) => void; includeYear?: boolean }) {
  return <div className="open-line-ranges" role="group" aria-label="Chart range">
    {OPEN_LINE_RANGES.filter(option => includeYear || option.value !== "year").map(option => <button key={option.value} type="button" aria-label={option.ariaLabel} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}

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
