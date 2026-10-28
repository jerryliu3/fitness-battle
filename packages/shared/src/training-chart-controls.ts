import type { TrainingRange } from "./training-types";

export const TRAINING_CHART_RANGE_OPTIONS: readonly {
  value: TrainingRange;
  label: string;
  ariaLabel: string;
}[] = [
  { value: "week", label: "Week", ariaLabel: "Week" },
  { value: "month", label: "Month", ariaLabel: "Month" },
  { value: "year", label: "Year", ariaLabel: "Year" },
];
