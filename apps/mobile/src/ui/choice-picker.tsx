import { useState } from "react";
import { ActionSheetIOS, FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SHELL_COLORS as c } from "../theme";
import { f } from "./focus";

/** Choices overlay their parent, including activity and settings sheets. Long lists are virtualized. */
export function ChoicePicker<T extends string>({ label, value, options, onChange, placeholder = "Choose…" }: {
  label: string; value: T | ""; options: readonly { value: T; label: string }[];
  onChange: (value: T) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.findIndex(option => option.value === value);
  const choose = () => {
    if (Platform.OS === "ios" && options.length <= 10) {
      ActionSheetIOS.showActionSheetWithOptions({ title: label, options: [...options.map(option => option.label), "Cancel"], cancelButtonIndex: options.length }, index => {
        if (index < options.length) onChange(options[index].value);
      });
    } else setOpen(true);
  };
  return <View style={{ flexShrink: 1 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${options[selected]?.label ?? placeholder}`}
      accessibilityState={{ expanded: open }} onPress={choose} style={[f.input, f.row]}>
      <Text style={[f.rowTitle, { flexShrink: 1 }]}>{options[selected]?.label ?? placeholder}</Text><Text style={f.copy}>⌄</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={s.overlay} accessibilityViewIsModal>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={`Cancel ${label}`} onPress={() => setOpen(false)} />
        <View style={s.menu}>
          <View style={[f.row, { padding: 16 }]}><Text accessibilityRole="header" style={f.h2}>{label}</Text><Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={{ minHeight: 44, justifyContent: "center" }}><Text style={f.rowTitle}>Cancel</Text></Pressable></View>
          <FlatList data={options} keyExtractor={option => option.value} initialScrollIndex={Math.max(0, selected)}
            getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
            renderItem={({ item }) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: value === item.value }}
              style={[f.row, s.option, value === item.value && { backgroundColor: c.soft }]}
              onPress={() => { onChange(item.value); setOpen(false); }}>
              <Text style={f.rowTitle}>{item.label}</Text><Text style={f.copy}>{value === item.value ? "✓" : ""}</Text>
            </Pressable>} />
        </View>
      </SafeAreaView>
    </Modal>
  </View>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#142b3b66" },
  menu: { maxHeight: "70%", backgroundColor: c.card, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: c.line },
  option: { height: 52, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: c.line },
});
