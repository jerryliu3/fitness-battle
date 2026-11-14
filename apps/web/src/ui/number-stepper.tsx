"use client";

import { formatCrewTargetLabel } from "@fitness-battle/shared";
import { AppText } from "./section";

/** Tactile stepper + optional preset chips for choosing a numeric target without typing. */
export function NumberStepper({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  presets,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  presets?: readonly number[];
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  const clamped = Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
  const apply = (next: number) => onChange(Math.max(min, Math.min(max, Math.round(next * 10) / 10)));

  return (
    <div className="fb-stepper-group" aria-label={label}>
      <div className="fb-stepper">
        <button
          type="button"
          className="fb-stepper-btn"
          aria-label={`Decrease ${label}`}
          disabled={disabled || clamped <= min}
          onClick={() => apply(clamped - step)}
        >
          <AppText role="heading">−</AppText>
        </button>
        <AppText role="value" className="fb-stepper-value">
          {formatCrewTargetLabel(clamped, unit)}
        </AppText>
        <button
          type="button"
          className="fb-stepper-btn"
          aria-label={`Increase ${label}`}
          disabled={disabled || clamped >= max}
          onClick={() => apply(clamped + step)}
        >
          <AppText role="heading">+</AppText>
        </button>
      </div>
      {presets && presets.length > 0 ? (
        <div className="fb-stepper-presets">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className="fb-stepper-chip"
              aria-pressed={clamped === preset}
              disabled={disabled}
              onClick={() => apply(preset)}
            >
              <AppText role="label">{formatCrewTargetLabel(preset, unit)}</AppText>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
