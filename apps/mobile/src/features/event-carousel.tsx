import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FocusButton, FocusSheet, f } from "../ui/focus";
import { SHELL_COLORS as c } from "../theme";
import { useReducedMotion } from "../ui/use-reduced-motion";
type ClubEvent = { id: string; label: string };
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
  const [width, setWidth] = useState(0),
    [choosing, setChoosing] = useState(false);
  const scroller = useRef<ScrollView>(null),
    fromScroll = useRef(false),
    reduced = useReducedMotion();
  const index = Math.max(
    0,
    events.findIndex((event) => event.id === value),
  );
  useEffect(() => {
    if (fromScroll.current) {
      fromScroll.current = false;
      return;
    }
    scroller.current?.scrollTo({ x: index * width, animated: !reduced });
  }, [index, width, reduced]);
  function select(id: string) {
    onChange(id);
  }
  return (
    <View
      style={{ gap: 10 }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <View style={f.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose event. ${events[index]?.label}, ${index + 1} of ${events.length}`}
          onPress={() => setChoosing(true)}
          style={{ flex: 1, minHeight: 54, gap: 4, justifyContent: "center" }}
        >
          <Text style={f.kicker}>
            Your events · {index + 1} of {events.length}
          </Text>
          <Text style={[f.h2, { fontFamily: "DMSans_700Bold" }]}>
            {events[index]?.label} ⌄
          </Text>
        </Pressable>
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
      {width > 0 ? (
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          directionalLockEnabled
          onMomentumScrollEnd={(event) => {
            const next = Math.max(
              0,
              Math.min(
                events.length - 1,
                Math.round(event.nativeEvent.contentOffset.x / width),
              ),
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
              style={{ width }}
              accessibilityElementsHidden={i !== index}
              importantForAccessibility={
                i === index ? "auto" : "no-hide-descendants"
              }
            >
              {i === index ? (
                children
              ) : (
                <View
                  style={{
                    minHeight: 400,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: c.soft,
                    borderRadius: 20,
                  }}
                >
                  <Text style={f.h2}>{event.label}</Text>
                  <Text style={f.copy}>Swipe to open this event</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      ) : null}
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
        onClose={() => setChoosing(false)}
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
            setChoosing(false);
            onRegister();
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
