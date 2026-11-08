import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { AppText } from "./section";
import { AppIcon } from "./app-icon";
import {
  SHELL_TABS,
  type ShellTabId,
} from "@fitness-battle/shared";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { playCue } from "../lib/haptics";

const tabIcons = { today: "home", arena: "compete", you: "progress", field: "crew" } as const;

export interface PhoneTabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigation?: {
    navigate: (name: string) => void;
    emit: (event: {
      type: "tabPress" | "tabLongPress";
      target: string;
      canPreventDefault?: boolean;
    }) => { type: string; defaultPrevented?: boolean };
  };
  navigateToTab?: (routeKey: string) => void;
  emitter?: {
    emit: (event: {
      type: "tabPress" | "tabLongPress";
      target: string;
      canPreventDefault?: boolean;
    }) => { type: string; defaultPrevented?: boolean };
  };
}

export function PhoneTabBar({
  state,
  navigation,
  navigateToTab,
  emitter,
}: PhoneTabBarProps) {
const SHELL_COLORS=useThemeColors();
const styles=useThemedStyles(stylesThemes);

  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { bottom: Math.max(insets.bottom, 10) }]}
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
              const event = emitter
                ? emitter.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  })
                : navigation?.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
              if (!selected && !event?.defaultPrevented) {
                void playCue("selection");
                if (navigateToTab) {
                  navigateToTab(route.key);
                } else if (navigation) {
                  navigation.navigate(route.name);
                }
              }
            }}
            onLongPress={() => {
              if (emitter) {
                emitter.emit({ type: "tabLongPress", target: route.key });
              } else if (navigation) {
                navigation.emit({ type: "tabLongPress", target: route.key });
              }
            }}
            style={[styles.tab, selected ? styles.tabOn : null]}
          >
            <AppIcon name={tabIcons[tab.id]} size={22} color={selected ? SHELL_COLORS.ink : SHELL_COLORS.muted} />
            <AppText role="caption" style={{ color: selected ? SHELL_COLORS.ink : SHELL_COLORS.muted }}>{tab.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const stylesThemes = createThemedStyles(themeColors=>{const SHELL_COLORS=themeColors;return {
  bar: {
    flexDirection: "row",
    gap: 6,
    position: "absolute",
    left: 14,
    right: 14,
    borderRadius: 28,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: `${themeColors.card}cc`,
    shadowColor: themeColors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    paddingHorizontal: 12,
    backgroundColor: `${themeColors.surfaceNavigation}ed`,
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
    backgroundColor: themeColors.soft,
  },
};});
