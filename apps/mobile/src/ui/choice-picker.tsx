import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { f } from "./focus";

/** A compact picker with an explicit empty state; expands in place, including inside a sheet. */
export function ChoicePicker<T extends string>({ label, value, options, onChange, placeholder = "Choose…" }: {
  label: string; value: T | ""; options: readonly { value: T; label: string }[];
  onChange: (value: T) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return <View style={{ gap: 8, flexShrink: 1 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${options.find(o => o.value === value)?.label ?? placeholder}`}
      accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={[f.input, f.row]}>
      <Text style={f.rowTitle}>{options.find(o => o.value === value)?.label ?? placeholder}</Text><Text style={f.copy}>⌄</Text>
    </Pressable>
    {open && <View accessibilityRole="radiogroup" accessibilityLabel={label} style={f.card}>
      {options.map(option => <Pressable key={option.value} accessibilityRole="radio"
        accessibilityState={{ checked: value === option.value }} style={[f.row, { minHeight: 48 }]}
        onPress={() => { onChange(option.value); setOpen(false); }}>
        <Text style={f.rowTitle}>{option.label}</Text><Text style={f.copy}>{value === option.value ? "✓" : ""}</Text>
      </Pressable>)}
    </View>}
  </View>;
}
