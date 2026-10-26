import { AppText } from "../ui/section";
import { competeEventCarouselPageIndex } from "@fitness-battle/shared";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
} from "react-native";
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
  const [pageWidth, setPageWidth] = useState(() => Dimensions.get("window").width);
  const index = Math.max(0, events.findIndex((event) => event.id === value));

  const syncScroll = useCallback(
    (animated: boolean) => {
      if (!pageWidth) return;
      scroller.current?.scrollTo({ x: index * pageWidth, animated });
    },
    [index, pageWidth],
  );

  useEffect(() => {
    if (fromScroll.current) {
      fromScroll.current = false;
      return;
    }
    syncScroll(true);
  }, [syncScroll]);

  useEffect(() => {
    syncScroll(false);
  }, [pageWidth, syncScroll]);

  const commitPage = useCallback(
    (offsetX: number) => {
      if (!pageWidth) return;
      const next = competeEventCarouselPageIndex(offsetX, pageWidth, events.length);
      if (next !== index) {
        fromScroll.current = true;
        onChange(events[next]!.id);
      }
    },
    [events, index, onChange, pageWidth],
  );

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
          if (next > 0 && Math.abs(next - pageWidth) > 0.5) setPageWidth(next);
        }}
      >
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          accessibilityLabel="Swipe between registered events"
          onMomentumScrollEnd={(e) => commitPage(e.nativeEvent.contentOffset.x)}
          onScrollEndDrag={(e) => commitPage(e.nativeEvent.contentOffset.x)}
        >
          {events.map((event, i) => (
            <View
              key={event.id}
              style={[s.page, { width: pageWidth }]}
              accessibilityRole="none"
              importantForAccessibility={i === index ? "yes" : "no-hide-descendants"}
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
