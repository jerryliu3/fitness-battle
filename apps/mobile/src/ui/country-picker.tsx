import { countryFlagEmoji, countryName, filterCountries } from "@fitness-battle/shared";
import { SearchablePicker } from "./searchable-picker";

function countryLabel(code: string, name: string) {
  return `${countryFlagEmoji(code)} ${name}`.trim();
}

export function CountryPicker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  return <SearchablePicker label="Country" optional placeholder="Search country" value={value}
    displayValue={value ? countryLabel(value, countryName(value) ?? value) : ""}
    search={query => filterCountries(query).map(country => ({
      value: country.code, label: countryLabel(country.code, country.name),
    }))}
    onChange={onChange} clearLabel="Clear country" />;
}
