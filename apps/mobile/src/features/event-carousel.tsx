import { AppText } from "../ui/section";
import { type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SHELL_COLORS as c } from "../theme";
type ClubEvent = { id: string; label: string; badge?: string };
export function EventCarousel({
  events,
  value,
  onChange,
  onRegister,
  children,
}: {
  events: ClubEvent[];
  value: string;
  onChange: (id: string) => void;
  onRegister: () => void;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={s.chipsBar}>
        <View style={s.chips} accessibilityRole="tablist" accessibilityLabel="Registered events">
          {events.map((event) => (
            <Pressable
              key={event.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: event.id === value }}
              onPress={() => onChange(event.id)}
              style={[s.chip, event.id === value && s.chipActive]}
            >
              <AppText role="label" style={event.id === value ? s.chipActiveText : undefined}>
                {event.label}
                {event.badge ? ` · ${event.badge}` : ""}
              </AppText>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Register for an event"
          onPress={onRegister}
          style={s.registerChip}
        >
          <AppText role="label" secondary>Register</AppText>
        </Pressable>
      </View>
      <View
        key={value}
        style={{
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: c.line,
          paddingVertical: 14,
        }}
      >
        {children}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  chipsBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
  },
  chipActive: {
    backgroundColor: c.ink,
    borderColor: c.ink,
  },
  chipActiveText: {
    color: c.tennis,
  },
  registerChip: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.line,
  },
});
