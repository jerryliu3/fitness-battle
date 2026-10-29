import { createThemedStyles, useThemedStyles } from "../theme";
import { AppText } from "../ui/section";
import { competeEventCarouselPageIndex } from "@fitness-battle/shared";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
} from "react-native";
import { FocusSegments } from "../ui/focus";
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
  const s = useThemedStyles(sThemes);

  const scroller = useRef<ScrollViewInstance>(null);
  const fromScroll = useRef(false);
  const indexRef = useRef(0);
  const windowWidth = useWindowDimensions().width;
  const [pageWidth, setPageWidth] = useState(windowWidth);
  const index = Math.max(0, events.findIndex((event) => event.id === value));
  indexRef.current = index;

  useEffect(() => {
    if (!pageWidth) return;
    if (fromScroll.current) {
      fromScroll.current = false;
      return;
    }
    scroller.current?.scrollTo({ x: index * pageWidth, animated: true });
  }, [index, pageWidth]);

  const prevPageWidth = useRef(0);
  useEffect(() => {
    if (!pageWidth || prevPageWidth.current === pageWidth) {
      prevPageWidth.current = pageWidth;
      return;
    }
    prevPageWidth.current = pageWidth;
    scroller.current?.scrollTo({
      x: indexRef.current * pageWidth,
      animated: false,
    });
  }, [pageWidth]);

  const commitPage = (offsetX: number) => {
    if (!pageWidth) return;
    const next = competeEventCarouselPageIndex(offsetX, pageWidth, events.length);
    if (next === indexRef.current) return;
    indexRef.current = next;
    fromScroll.current = true;
    onChange(events[next]!.id);
  };

  const segmentOptions = events.map((event) => ({
    value: event.id,
    label: event.label,
  }));

  return (
    <View style={{ gap: 12 }}>
      <FocusSegments
        variant="tabs"
        label="Registered events"
        value={value}
        options={segmentOptions}
        onChange={onChange}
      />
      <View
        onLayout={(e) => {
          const next = Math.round(e.nativeEvent.layout.width);
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

const sThemes = createThemedStyles((themeColors) => ({
  page: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: themeColors.line,
  },
  pageBody: {
    paddingVertical: 14,
  },
}));
