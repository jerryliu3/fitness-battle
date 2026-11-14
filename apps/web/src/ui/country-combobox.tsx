"use client";

import { filterCountries, countryName } from "@fitness-battle/shared";
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
  useEffect(() => {
    setQuery(value ? (countryName(value) ?? value) : "");
  }, [value]);
  const options = useMemo(() => filterCountries(query), [query]);

  return (
    <label className="fb-field">
      <AppText role="field">{label} · optional</AppText>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          list="country-options"
          value={query}
          onChange={(e) => {
            const text = e.target.value;
            setQuery(text);
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
          placeholder="Search country"
          autoComplete="off"
          style={{ flex: 1 }}
        />
        {value ? (
          <button type="button" className="fb-btn-line" onClick={() => onChange("")}>
            Clear
          </button>
        ) : null}
      </div>
      <datalist id="country-options">
        {options.map((row) => (
          <option key={row.code} value={row.name} />
        ))}
      </datalist>
    </label>
  );
}