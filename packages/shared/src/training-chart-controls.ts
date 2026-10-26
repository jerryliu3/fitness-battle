import type { TrainingRange } from "./training-types";

export const TRAINING_CHART_RANGE_OPTIONS: readonly {
  value: TrainingRange;
  label: string;
  ariaLabel: string;
}[] = [
  { value: "week", label: "W", ariaLabel: "Week" },
  { value: "month", label: "M", ariaLabel: "Month" },
  { value: "year", label: "Y", ariaLabel: "Year" },
];
