import { textStyle } from "./section";
import { dayKey } from "@fitness-battle/shared";
import { useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { SHELL_COLORS as c } from "../theme";
import { f } from "./focus";

function PickerSurface({ label, close, done, children }: { label: string; close: () => void; done: () => void; children: React.ReactNode }) {
  return <Modal transparent animationType="fade" onRequestClose={close}>
    <View style={{ flex: 1, backgroundColor: "#142b3b66", justifyContent: "center", padding: 24 }} accessibilityViewIsModal>
      <View style={[f.card, { backgroundColor: c.card }]}>
        <Text accessibilityRole="header" style={textStyle("heading")}>{label}</Text>{children}
        <View style={f.row}><Pressable accessibilityRole="button" onPress={close} style={{ padding: 12 }}><Text style={textStyle("label")}>Cancel</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={done} style={{ padding: 12 }}><Text style={textStyle("label")}>Done</Text></Pressable></View>
      </View>
    </View>
  </Modal>;
}
export function NumberPicker({ label, value, onChange, max = 1440, step = 1, unit }: { label: string; value: string; onChange: (value: string) => void; max?: number; step?: number; unit: string }) {
  const [open, setOpen] = useState(false), [draft, setDraft] = useState("0");
  const fractional = step < 1;
  const options = Array.from({ length: Math.floor(max) + 1 }, (_, i) => String(i));
  const whole = Math.floor(Number(draft));
  const tenth = Math.round((Number(draft) - whole) * 10);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value || "Choose"} ${unit}`} style={f.input} onPress={() => { setDraft(value || "0"); setOpen(true); }}><Text style={textStyle("label")}>{value ? `${value} ${unit}` : `Choose ${label.toLowerCase()}`}</Text></Pressable>
    {open && <PickerSurface label={label} close={() => setOpen(false)} done={() => { onChange(draft); setOpen(false); }}>
      <View style={{ flexDirection: "row" }}>
        <Picker accessibilityLabel={label} selectedValue={String(whole)} onValueChange={item => setDraft(String(Number(item) + (fractional && Number(item) < max ? tenth / 10 : 0)))} style={{ color: c.ink, flex: 1 }}>
          {options.map(option => <Picker.Item key={option} label={`${option} ${unit}`} value={option} color={c.ink} />)}
        </Picker>
        {fractional && <Picker accessibilityLabel={`${label} tenths`} selectedValue={tenth} onValueChange={item => setDraft(String(Math.min(max, whole + Number(item) / 10)))} style={{ color: c.ink, flex: 1 }}>
          {Array.from({ length: whole >= max ? 1 : 10 }, (_, i) => <Picker.Item key={i} label={`.${i}`} value={i} color={c.ink} />)}
        </Picker>}
      </View>
    </PickerSurface>}
  </>;
}
/** Values are wall-clock strings. Existing Eastern validators resolve instants and reject DST gaps. */
export function DateTimeField({ label, value, mode, onChange, clearLabel }: { label: string; value: string; mode: "date" | "time"; onChange: (value: string) => void; clearLabel?: string }) {
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(new Date());
  const serialize = (date: Date) => mode === "date" ? date.toISOString().slice(0, 10) : date.toISOString().slice(11, 16);
  const accept = (date: Date) => { onChange(serialize(date)); setOpen(false); };
  const picker = <DateTimePicker accessibilityLabel={label} value={draft} mode={mode} timeZoneName="UTC" themeVariant="light"
    display={Platform.OS === "ios" ? "spinner" : "default"} onDismiss={() => setOpen(false)}
    onValueChange={(_, date) => Platform.OS === "android" ? accept(date) : setDraft(date)} />;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value || "Choose"}`} style={f.input} onPress={() => {
      const date = new Date(mode === "date" ? `${value || dayKey(new Date())}T12:00:00Z` : `2000-01-01T${value || "08:00"}:00Z`);
      setDraft(date); setOpen(true);
    }}><Text style={textStyle("label")}>{value || `Choose ${mode}`}</Text></Pressable>
    {value && clearLabel ? <Pressable accessibilityRole="button" accessibilityLabel={clearLabel} onPress={() => { onChange(""); setOpen(false); }} style={{ paddingVertical: 12 }}><Text style={textStyle("label")}>{clearLabel}</Text></Pressable> : null}
    {open && (Platform.OS === "android" ? picker : <PickerSurface label={label} close={() => setOpen(false)} done={() => accept(draft)}>{picker}</PickerSurface>)}
  </>;
}
