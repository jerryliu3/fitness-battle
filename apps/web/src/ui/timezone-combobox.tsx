"use client";

import { listTimeZoneOptions } from "@fitness-battle/shared";
import { useId, useMemo, useState } from "react";

export function TimezoneCombobox({
  value,
  onChange,
  label = "Time zone",
}: {
  value: string;
  onChange: (timeZone: string) => void;
  label?: string;
}) {
  const options = useMemo(() => listTimeZoneOptions(), []);
  const [query, setQuery] = useState<string | null>(null);
  const listId = useId();
  const filtered = useMemo(() => {
    const q = query?.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (row) =>
        row.value.toLowerCase().includes(q) ||
        row.label.toLowerCase().includes(q),
    );
  }, [options, query]);
  const selected = options.find((row) => row.value === value);

  return (
    <label className="fb-field">
      {label}
      <input
        type="search"
        className="fb-input"
        list={listId}
        value={query ?? selected?.label ?? value}
        placeholder="Search time zones"
        onChange={(event) => {
          setQuery(event.target.value);
          const exact = options.find(
            (row) =>
              row.value === event.target.value ||
              row.label === event.target.value,
          );
          if (exact) onChange(exact.value);
        }}
        onBlur={() => setQuery(null)}
      />
      <datalist id={listId}>
        {filtered.slice(0, 200).map((row) => (
          <option key={row.value} value={row.label} />
        ))}
      </datalist>
      {selected ? (
        <small className="fb-note">{selected.value}</small>
      ) : null}
    </label>
  );
}