import { FIELD_ARENA_CHROME_ORDER, type FieldArenaChromeSlot } from "@fitness-battle/shared";
import type { ReactNode } from "react";
import { View } from "react-native";

export function FieldArenaChromeStack({ slots }: { slots: Partial<Record<FieldArenaChromeSlot, ReactNode>> }) {
  return (
    <View style={{ flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
      {FIELD_ARENA_CHROME_ORDER.map((slot) => (slots[slot] ? <View key={slot}>{slots[slot]}</View> : null))}
    </View>
  );
}