"use client";

import { formatTimeZoneLabel, listTimeZoneOptions } from "@fitness-battle/shared";
import { useMemo } from "react";
import { SearchableCombobox } from "./searchable-combobox";

export function TimezoneCombobox({ value, onChange, label = "Time zone" }: {
  value: string;
  onChange: (timeZone: string) => void;
  label?: string;
}) {
  const options = useMemo(() => listTimeZoneOptions(), []);
  const selected = options.find(option => option.value === value);
  return <>
    <SearchableCombobox label={label} placeholder="Search time zones" value={value}
      displayValue={selected?.label ?? formatTimeZoneLabel(value)}
      optionsFor={query => {
        const search = query.trim().toLowerCase();
        return options.filter(option => option.label.toLowerCase().includes(search) || option.value.toLowerCase().includes(search));
      }}
      onChange={onChange} emptyMessage="No matching time zones" />
    {selected && <small className="fb-note">{selected.value}</small>}
  </>;
}
