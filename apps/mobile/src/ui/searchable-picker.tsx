import { useState } from "react";
import { Pressable, View } from "react-native";
import { useThemeColors } from "../theme";
import { FocusSheet, useFocusStyles } from "./focus";
import { SearchField } from "./search-field";
import { AppText } from "./section";

export function SearchablePicker({ label, placeholder, value, displayValue, search, onChange, clearLabel, optional = false }: {
  label: string;
  placeholder: string;
  value: string;
  displayValue: string;
  search: (query: string) => readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  clearLabel?: string;
  optional?: boolean;
}) {
  const f = useFocusStyles();
  const c = useThemeColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const accessibleLabel = optional ? `${label} (optional)` : label;
  const close = () => setOpen(false);
  const options = open ? search(query) : [];
  const choose = (next: string) => { onChange(next); close(); };
  return <>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={displayValue ? `${accessibleLabel}: ${displayValue}` : accessibleLabel}
      accessibilityState={{ expanded: open }}
      onPress={() => { setQuery(""); setOpen(true); }}
      style={[f.input, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }]}
    >
      <AppText numberOfLines={1} style={{ flexShrink: 1 }}>{displayValue || label}</AppText>
      <AppText accessibilityElementsHidden importantForAccessibility="no-hide-descendants" secondary>⌄</AppText>
    </Pressable>
    <FocusSheet open={open} title={label} onClose={close} hideTitle fastOpen>
      <SearchField accessibilityLabel={placeholder} placeholder={placeholder} value={query} onChangeText={setQuery} />
      {clearLabel && Boolean(value) && <Pressable accessibilityRole="button" onPress={() => choose("")} style={{ minHeight: 44, justifyContent: "center" }}>
        <AppText>{clearLabel}</AppText>
      </Pressable>}
      <View>
        {options.map(option => <Pressable key={option.value} accessibilityRole="button"
          accessibilityLabel={option.label} accessibilityState={{ selected: option.value === value }}
          onPress={() => choose(option.value)}
          style={({ pressed }) => ({
            minHeight: 44, paddingVertical: 10, paddingHorizontal: 8,
            flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "space-between",
            borderBottomWidth: 1, borderBottomColor: c.line,
            backgroundColor: pressed ? c.accentSecondarySoft : "transparent",
          })}>
          <AppText style={{ flexShrink: 1 }}>{option.label}</AppText>
          {option.value === value && <AppText accessibilityElementsHidden importantForAccessibility="no-hide-descendants">✓</AppText>}
        </Pressable>)}
        {open && !options.length && <AppText secondary accessibilityLiveRegion="polite">No matches found</AppText>}
      </View>
    </FocusSheet>
  </>;
}
