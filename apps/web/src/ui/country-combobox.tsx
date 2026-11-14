"use client";

import { filterCountries, countryName } from "@fitness-battle/shared";
import { useMemo, useState } from "react";
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
  const [query, setQuery] = useState(countryName(value) ?? "");
  const options = useMemo(() => filterCountries(query), [query]);

  return (
    <label className="fb-field">
      <AppText role="field">{label} · optional</AppText>
      <input
        list="country-options"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          const match = filterCountries(e.target.value).find(
            (row) =>
              row.name.toLowerCase() === e.target.value.trim().toLowerCase() ||
              row.code.toLowerCase() === e.target.value.trim().toLowerCase(),
          );
          if (match) onChange(match.code);
        }}
        placeholder="Search country"
        autoComplete="off"
      />
      <datalist id="country-options">
        {options.map((row) => (
          <option key={row.code} value={row.name} />
        ))}
      </datalist>
    </label>
  );
}