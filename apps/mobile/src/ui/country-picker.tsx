import { countryFlagEmoji, countryName, filterCountries } from "@fitness-battle/shared";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { FocusSheet, useFocusStyles } from "./focus";
import { AppText } from "./section";

/** Search in a sheet so opening the country list never resizes the onboarding canvas. */
export function CountryPicker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const f = useFocusStyles();
  const [open, setOpen] = useState(false), [query, setQuery] = useState("");
  const close = () => setOpen(false);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Country (optional): ${countryName(value) ?? "Choose"}`} style={f.input} onPress={() => { setQuery(""); setOpen(true); }}>
      <AppText numberOfLines={1}>{value ? `${countryFlagEmoji(value)} ${countryName(value) ?? value}` : "Country"}</AppText>
    </Pressable>
    <FocusSheet open={open} title="Country" onClose={close} fastOpen>
      <TextInput accessibilityLabel="Search country" placeholder="Search country" value={query} onChangeText={setQuery} style={f.input} autoCorrect={false} />
      {Boolean(value) && <Pressable accessibilityRole="button" onPress={() => { onChange(""); close(); }} style={{ paddingVertical: 12 }}><AppText>Clear country</AppText></Pressable>}
      <View>{filterCountries(query).map(country => <Pressable key={country.code} accessibilityRole="button" accessibilityLabel={`${countryFlagEmoji(country.code)} ${country.name}`} accessibilityState={{ selected: country.code === value }}
        onPress={() => { onChange(country.code); close(); }} style={{ paddingVertical: 12 }}>
        <AppText>{countryFlagEmoji(country.code)} {country.name}</AppText>
      </Pressable>)}</View>
    </FocusSheet>
  </>;
}
