import { AppText } from "../ui/section";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from "react-native";
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
  const scroller = useRef<ScrollViewInstance>(null);
  const fromScroll = useRef(false);
  const [pageWidth, setPageWidth] = useState(0);
  const index = Math.max(0, events.findIndex((event) => event.id === value));

  useEffect(() => {
    if (fromScroll.current) {
      fromScroll.current = false;
      return;
    }
    if (!pageWidth) return;
    scroller.current?.scrollTo({ x: index * pageWidth, animated: true });
  }, [index, pageWidth]);

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
        onLayout={(e) => {
          const next = e.nativeEvent.layout.width;
          if (next > 0 && next !== pageWidth) setPageWidth(next);
        }}
      >
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          accessibilityLabel="Swipe between registered events"
          onMomentumScrollEnd={(e) => {
            if (!pageWidth) return;
            const next = Math.max(
              0,
              Math.min(events.length - 1, Math.round(e.nativeEvent.contentOffset.x / pageWidth)),
            );
            if (next !== index) {
              fromScroll.current = true;
              onChange(events[next]!.id);
            }
          }}
        >
          {events.map((event, i) => (
            <View
              key={event.id}
              style={[
                s.page,
                pageWidth ? { width: pageWidth } : undefined,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: i === index }}
              accessibilityLabel={`${event.label}, ${i + 1} of ${events.length}`}
            >
              {i === index ? (
                <View style={s.pageBody}>{children}</View>
              ) : (
                <View style={s.pageBody}>
                  <AppText role="heading">{event.label}</AppText>
                  <AppText role="body" secondary>Swipe to open this event</AppText>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
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
  page: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: c.line,
  },
  pageBody: {
    paddingVertical: 14,
  },
});
