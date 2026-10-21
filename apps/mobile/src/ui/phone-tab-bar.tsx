import Svg, { Path } from "react-native-svg";
import {
  SHELL_TAB_ICONS,
  SHELL_TABS,
  type ShellTabId,
} from "@fitness-battle/shared";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SHELL_COLORS, SHELL_RADIUS } from "../theme";
import { playCue } from "../lib/haptics";

interface PhoneTabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigation: {
    navigate: (name: string) => void;
    emit: (event: { type: "tabPress" | "tabLongPress"; target: string; canPreventDefault?: boolean }) => { type: string; defaultPrevented?: boolean };
  };
}

export function PhoneTabBar({ state, navigation }: PhoneTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      {state.routes.map((route, index) => {
        const tab = SHELL_TABS.find(
          (item) => item.id === (route.name as ShellTabId),
        );
        if (!tab) return null;
        const selected = state.index === index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!selected && !event.defaultPrevented) {
                void playCue("selection");
                navigation.navigate(route.name);
              }
            }}
            onLongPress={() => { navigation.emit({ type: "tabLongPress", target: route.key }); }}
            style={[styles.tab, selected ? styles.tabOn : null]}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" accessible={Platform.OS === "web" ? undefined : false}>
              <Path
                d={SHELL_TAB_ICONS[tab.id]}
                fill="none"
                stroke={selected ? SHELL_COLORS.ink : SHELL_COLORS.muted}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={[styles.label, selected ? styles.labelOn : null]}>
              {tab.label}
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
    minHeight: 56,
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 6,
  },
  tabOn: {
    backgroundColor: SHELL_COLORS.tennis,
  },
  label: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    color: SHELL_COLORS.muted,
  },
  labelOn: {
    color: SHELL_COLORS.ink,
  },
});
