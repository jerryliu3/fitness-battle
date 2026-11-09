import { useState, type ReactNode } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";

/** onLayout measures untransformed height; resize/rotation re-fit without a clock. */
export function WeekRecapFit({ children }: { children: ReactNode }) {
  const [available, setAvailable] = useState(0);
  const [natural, setNatural] = useState(0);
  const { fontScale } = useWindowDimensions();
  const scale = available && natural ? Math.min(1, available / natural) : 1;
  if (fontScale > 1.3) return <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 6 }}>{children}</ScrollView>;
  return <View style={{ flex: 1, minHeight: 0, overflow: "hidden" }} onLayout={e => setAvailable(e.nativeEvent.layout.height)}>
    <View onLayout={e => setNatural(e.nativeEvent.layout.height)} style={{ position: "absolute", top: Math.max(0, (available - natural * scale) / 2), left: 0, right: 0, padding: 6, opacity: available && natural ? 1 : 0, transformOrigin: "top center", transform: [{ scale }] }}>
      {children}
    </View>
  </View>;
}
