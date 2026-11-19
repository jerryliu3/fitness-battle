"use client";

import { countryFlagEmoji, countryName, filterCountries } from "@fitness-battle/shared";
import { SearchableCombobox } from "./searchable-combobox";

export function CountryCombobox({ value, onChange, label = "Country" }: {
  value: string;
  onChange: (code: string) => void;
  label?: string;
}) {
  return <SearchableCombobox label={label} placeholder="Search country" value={value}
    displayValue={countryName(value) ?? ""}
    optionsFor={query => {
      const options = filterCountries(query).map(country => ({
        value: country.code, label: `${countryFlagEmoji(country.code)} ${country.name}`.trim(),
      }));
      return value && !query.trim() ? [{ value: "", label: "Clear country" }, ...options] : options;
    }}
    onChange={onChange} emptyMessage="No matching countries" />;
}
