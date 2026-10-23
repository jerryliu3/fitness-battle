import { useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FocusButton, FocusSheet, f } from "../ui/focus";
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
  const [choosing, setChoosing] = useState(false);
  const headerStart = useRef({ x: 0, y: 0 });
  const registerAfterClose = useRef(false);
  const index = Math.max(
    0,
    events.findIndex((event) => event.id === value),
  );
  function select(id: string) {
    onChange(id);
  }
  return (
    <View style={{ gap: 10 }}>
      <View style={f.row}>
        <View
          accessible
          accessibilityRole="button"
          accessibilityHint="Swipe left or right to switch events, or tap to choose."
          accessibilityLabel={`Choose event. ${events[index]?.label}, ${index + 1} of ${events.length}`}
          onAccessibilityTap={() => setChoosing(true)}
          accessibilityActions={[{ name: "activate", label: "Choose event" }]}
          onAccessibilityAction={() => setChoosing(true)}
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            headerStart.current = {
              x: e.nativeEvent.pageX,
              y: e.nativeEvent.pageY,
            };
          }}
          onResponderRelease={(e) => {
            const dx = e.nativeEvent.pageX - headerStart.current.x;
            const dy = e.nativeEvent.pageY - headerStart.current.y;
            if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) {
              const next = Math.max(
                0,
                Math.min(events.length - 1, index + (dx < 0 ? 1 : -1)),
              );
              if (next !== index) select(events[next]!.id);
            } else if (Math.hypot(dx, dy) < 12) setChoosing(true);
          }}
          style={{ flex: 1, minHeight: 54, gap: 4, justifyContent: "center" }}
        >
          <Text style={f.kicker}>
            Your events · {index + 1} of {events.length} · ↔
          </Text>
          <Text style={[f.h2, { fontFamily: "DMSans_700Bold" }]}>
            {events[index]?.label} ⌄
            {events[index]?.badge ? <Text style={[f.small, { color: c.muted }]}>  {events[index]?.badge}</Text> : null}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous event"
          disabled={index === 0}
          accessibilityState={{ disabled: index === 0 }}
          onPress={() => select(events[index - 1]!.id)}
          style={[s.arrow, index === 0 && { opacity: 0.3 }]}
        >
          <Text style={f.h2}>←</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next event"
          disabled={index === events.length - 1}
          accessibilityState={{ disabled: index === events.length - 1 }}
          onPress={() => select(events[index + 1]!.id)}
          style={[s.arrow, index === events.length - 1 && { opacity: 0.3 }]}
        >
          <Text style={f.h2}>→</Text>
        </Pressable>
      </View>
      {/* Event title owns event swipes; the board owns lane swipes. Avoid nested horizontal pagers trapping vertical page gestures. */}
      <View key={value} style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line, paddingVertical: 14 }}>{children}</View>
      <View style={{ flexDirection: "row", justifyContent: "center" }}>
        {events.map((event, i) => (
          <Pressable
            key={event.id}
            accessibilityRole="button"
            accessibilityLabel={`Show ${event.label}`}
            accessibilityState={{ selected: i === index }}
            onPress={() => select(event.id)}
            style={{
              minWidth: 32,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: i === index ? 24 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === index ? c.tennis : c.line,
              }}
            />
          </Pressable>
        ))}
      </View>
      <FocusSheet
        open={choosing}
        title="Choose your event"
        body="Each registration has its own competition field."
        onClose={() => {
          registerAfterClose.current = false;
          setChoosing(false);
        }}
        onClosed={() => {
          if (!registerAfterClose.current) return;
          registerAfterClose.current = false;
          onRegister();
        }}
      >
        {events.map((event) => (
          <Pressable
            key={event.id}
            accessibilityRole="button"
            accessibilityState={{ selected: event.id === value }}
            onPress={() => {
              select(event.id);
              setChoosing(false);
            }}
            style={[
              f.row,
              {
                minHeight: 56,
                borderBottomWidth: 1,
                borderBottomColor: c.line,
              },
            ]}
          >
            <Text style={f.rowTitle}>{event.label}</Text>
            <Text style={f.copy}>{event.id === value ? "✓" : "→"}</Text>
          </Pressable>
        ))}
        <FocusButton
          label="Register for another event"
          onPress={() => {
            registerAfterClose.current = true;
            setChoosing(false);
          }}
        />
      </FocusSheet>
    </View>
  );
}
const s = StyleSheet.create({
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
  },
});
