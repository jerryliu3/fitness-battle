import { filterCountries, countryName } from "@fitness-battle/shared";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useAnchoredMenu, AnchoredMenu } from "./anchored-menu";
import { useFocusStyles } from "./focus";
import { textStyle } from "./section";
import { useThemeColors } from "../theme";

export function SearchableCountryPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
}) {
  const c = useThemeColors();
  const f = useFocusStyles();
  const [query, setQuery] = useState("");
  const { open, close, toggle, anchorRef, menuLayout } = useAnchoredMenu({
    minWidth: 280,
    estimatedHeight: 320,
  });
  const options = useMemo(() => filterCountries(query), [query]);
  const display = value ? `${countryName(value) ?? value} (${value})` : "Choose country (optional)";

  return (
    <View>
      <Text style={textStyle("label")}>{label}</Text>
      <View ref={anchorRef} collapsable={false}>
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={toggle} style={f.input}>
          <Text style={textStyle("label")}>{display}</Text>
        </Pressable>
      </View>
      <AnchoredMenu open={open} layout={menuLayout} onClose={close}>
        <View style={{ padding: 12, gap: 8, maxHeight: 320 }}>
          <TextInput
            accessibilityLabel="Search countries"
            placeholder="Search"
            value={query}
            onChangeText={setQuery}
            style={[f.input, { marginBottom: 4 }]}
            autoCapitalize="none"
          />
          <ScrollView keyboardShouldPersistTaps="handled">
            {options.map((row) => (
              <Pressable
                key={row.code}
                accessibilityRole="button"
                onPress={() => {
                  onChange(row.code);
                  setQuery("");
                  close();
                }}
                style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}
              >
                <Text style={textStyle("label")}>{row.name}</Text>
                <Text style={textStyle("caption")}>{row.code}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </AnchoredMenu>
    </View>
  );
}