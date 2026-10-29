"use client";
import "@/ui/open-line-chart.css";

import { OPEN_LINE_RANGES, type OpenLineRange, type TrainingRange } from "@fitness-battle/shared";

export function OpenLineRangeToggle({ value, onChange, includeYear = true, calendar = false }: { value: OpenLineRange; onChange: (range: OpenLineRange) => void; includeYear?: boolean; calendar?: boolean }) {
  return <div className="open-line-ranges" role="group" aria-label="Chart range">
    {OPEN_LINE_RANGES.filter(option => includeYear || option.value !== "year").map(option => <button key={option.value} type="button" aria-label={calendar && option.value === "fourWeeks" ? "One month" : option.ariaLabel} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{calendar && option.value === "fourWeeks" ? "1M" : option.label}</button>)}
  </div>;
}

export function ChartRangeToggle({ value, onChange }: { value: TrainingRange; onChange: (range: TrainingRange) => void }) {
 return <OpenLineRangeToggle calendar value={value === "month" ? "fourWeeks" : value} onChange={next => onChange(next === "fourWeeks" ? "month" : next)} />;
}
