"use client";

import { countryFlagEmoji, countryName, filterCountries } from "@fitness-battle/shared";
import { useEffect, useMemo, useState } from "react";
import { AppText } from "./section";

export function CountryCombobox({
  value,
  onChange,
  label = "Country",
}: {
  value: string;
  onChange: (code: string) => void;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(value ? (countryName(value) ?? "") : "");
  }, [value]);

  const options = useMemo(() => filterCountries(query), [query]);

  return (
    <label className="fb-field">
      <AppText role="field">{label}</AppText>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {value && <span aria-hidden>{countryFlagEmoji(value)}</span>}
      <input
        style={{ minWidth: 0, flex: 1 }}
        value={query}
        onChange={(e) => {
          const text = e.target.value;
          setQuery(text);
          setOpen(true);
          if (!text.trim()) {
            onChange("");
            return;
          }
          const match = filterCountries(text).find(
            (row) =>
              row.name.toLowerCase() === text.trim().toLowerCase() ||
              row.code.toLowerCase() === text.trim().toLowerCase(),
          );
          if (match) onChange(match.code);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search country"
        autoComplete="off"
      />
      </span>
      {open && options.length > 0 ? (
        <ul
          className="fb-stack"
          role="listbox"
          style={{
            marginTop: 8,
            maxHeight: 220,
            overflowY: "auto",
            border: "1px solid var(--line, #e3e9e7)",
            borderRadius: 12,
            background: "var(--card, #fff)",
            padding: 0,
            listStyle: "none",
          }}
        >
          {options.map((row) => (
            <li key={row.code}>
              <button
                type="button"
                role="option"
                aria-selected={row.code === value}
                className="fb-btn-line"
                style={{
                  width: "100%",
                  justifyContent: "flex-start",
                  borderRadius: 0,
                  border: "none",
                  borderBottom: "1px solid var(--line, #e3e9e7)",
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(row.code);
                  setQuery(row.name);
                  setOpen(false);
                }}
              >
                {countryFlagEmoji(row.code)} {row.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </label>
  );
}