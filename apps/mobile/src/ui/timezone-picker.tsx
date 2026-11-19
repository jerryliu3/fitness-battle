import { compactTimeZoneOptions, formatTimeZoneLabel, listTimeZoneOptions } from "@fitness-battle/shared";
import { useMemo } from "react";
import { SearchablePicker } from "./searchable-picker";

export function TimezonePicker({
  label = "Time zone",
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (timeZone: string) => void;
}) {
  const compact = useMemo(() => compactTimeZoneOptions(), []);
  const options = useMemo(() => listTimeZoneOptions(), []);
  const displayValue = options.find(option => option.value === value)?.label ?? formatTimeZoneLabel(value);
  const initialOptions = value && !compact.some(option => option.value === value)
    ? [{ value, label: displayValue }, ...compact] : compact;
  return <SearchablePicker label={label} placeholder="Search time zones" value={value}
    displayValue={displayValue}
    search={query => {
      const search = query.trim().toLowerCase();
      return search ? options.filter(option => option.label.toLowerCase().includes(search) || option.value.toLowerCase().includes(search)) : initialOptions;
    }}
    onChange={onChange} />;
}
