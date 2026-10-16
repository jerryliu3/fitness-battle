import { SHELL_TABS, type ShellTabId } from "@fitness-battle/shared";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SHELL_COLORS, SHELL_RADIUS } from "../theme";

interface PhoneTabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigation: {
    navigate: (name: string) => void;
  };
}

export function PhoneTabBar({ state, navigation }: PhoneTabBarProps) {
  const insets = useSafeAreaInsets();
  const [optimistic, setOptimistic] = useState<number | null>(null);
  const active = optimistic ?? state.index;

  useEffect(() => {
    setOptimistic(null);
  }, [state.index]);

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      {state.routes.map((route, index) => {
        const tab = SHELL_TABS.find((item) => item.id === (route.name as ShellTabId));
        if (!tab) return null;
        const selected = active === index;
        const label =
          route.name === "today"
            ? "Home"
            : route.name === "arena"
              ? "Arena"
              : route.name === "field"
                ? "Crew"
                : route.name === "you"
                  ? "Athlete"
                  : tab.label;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            onPress={() => {
              setOptimistic(index);
              navigation.navigate(route.name);
            }}
            style={[styles.tab, selected ? styles.tabOn : null]}
          >
            <Text style={[styles.label, selected ? styles.labelOn : null]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    gap: 6,
    paddingTop: 8,
    paddingHorizontal: 12,
    backgroundColor: SHELL_COLORS.card,
    borderTopWidth: 1,
    borderTopColor: SHELL_COLORS.line,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SHELL_RADIUS.pill,
  },
  tabOn: {
    backgroundColor: SHELL_COLORS.plum,
  },
  label: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: SHELL_COLORS.muted,
  },
  labelOn: {
    color: SHELL_COLORS.tennis,
  },
});
