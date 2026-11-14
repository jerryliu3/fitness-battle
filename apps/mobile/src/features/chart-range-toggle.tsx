import { OPEN_LINE_RANGES, type OpenLineRange, type TrainingRange } from "@fitness-battle/shared";
import { FocusSegments } from "../ui/focus";

export function OpenLineRangeToggle({ value, onChange, includeYear = true, calendar = false }: { value: OpenLineRange; onChange: (range: OpenLineRange) => void; includeYear?: boolean; calendar?: boolean }) {
  const options = OPEN_LINE_RANGES
    .filter((option) => includeYear || option.value !== "year")
    .map((option) => ({
      value: option.value,
      label: calendar && option.value === "fourWeeks" ? "1M" : option.label,
      accessibilityLabel: calendar && option.value === "fourWeeks" ? "One month" : option.ariaLabel,
    }));
  return <FocusSegments compact label="Chart range" value={value} options={options} onChange={onChange} />;
}

export function ChartRangeToggle({ value, onChange }: { value: TrainingRange; onChange: (range: TrainingRange) => void }) {
  return <OpenLineRangeToggle calendar value={value === "month" ? "fourWeeks" : value} onChange={next => onChange(next === "fourWeeks" ? "month" : next)} />;
}
