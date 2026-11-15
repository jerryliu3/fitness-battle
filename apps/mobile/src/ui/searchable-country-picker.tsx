import { countryFlagEmoji, countryName, filterCountries } from "@fitness-battle/shared";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { useFocusStyles } from "./focus";
import { AppText } from "./section";
import { useThemeColors } from "../theme";

export function SearchableCountryPicker({
  label,
  value,
  onChange,
  allowClear = false,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
  allowClear?: boolean;
}) {
  const c = useThemeColors();
  const f = useFocusStyles();
  const [query, setQuery] = useState(value ? (countryName(value) ?? "") : "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(value ? (countryName(value) ?? "") : "");
  }, [value]);

  const options = useMemo(() => filterCountries(query), [query]);
  const selectedName = value ? countryName(value) : null;

  return (
    <View>
      <AppText role="label">{label}</AppText>
      <View style={{ gap: 8 }}>
        <TextInput
          accessibilityLabel={label}
          placeholder="Search country"
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setOpen(true);
            if (!text.trim()) onChange("");
            else {
              const match = filterCountries(text).find(
                (row) => row.name.toLowerCase() === text.trim().toLowerCase(),
              );
              if (match) onChange(match.code);
            }
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          style={f.input}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {allowClear && value ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear country" onPress={() => onChange("")}>
            <AppText role="caption">Clear</AppText>
          </Pressable>
        ) : null}
        {open && options.length > 0 ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{
              maxHeight: 220,
              borderWidth: 1,
              borderColor: c.line,
              borderRadius: 12,
              backgroundColor: c.card,
            }}
          >
            {options.map((row) => {
              const flag = countryFlagEmoji(row.code);
              const active = row.code === value || row.name === selectedName;
              return (
                <Pressable
                  key={row.code}
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(row.code);
                    setQuery(row.name);
                    setOpen(false);
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: c.line,
                    backgroundColor: active ? c.actionSoft : c.card,
                  }}
                >
                  <AppText role="label">
                    {flag ? `${flag} ` : ""}
                    {row.name}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}