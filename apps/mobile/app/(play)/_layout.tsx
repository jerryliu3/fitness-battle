import { Tabs } from "expo-router";
import { Text } from "react-native";
import { brand, colors, fonts } from "../../src/theme";

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontFamily: focused ? fonts.bodyBold : fonts.bodyMedium,
        fontSize: 10,
        color: focused ? colors.tennis : colors.plum,
      }}
    >
      {label}
    </Text>
  );
}

export default function PlayLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: 68,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarActiveBackgroundColor: colors.plum,
        tabBarItemStyle: {
          borderRadius: 0,
          marginHorizontal: 2,
          paddingVertical: 2,
        },
        tabBarActiveTintColor: colors.tennis,
        tabBarInactiveTintColor: colors.plum,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: brand.tabs.track,
          tabBarLabel: ({ focused }) => (
            <TabLabel label={brand.tabs.track} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="board"
        options={{
          title: brand.tabs.field,
          tabBarLabel: ({ focused }) => (
            <TabLabel label={brand.tabs.field} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="splits"
        options={{
          title: brand.tabs.splits,
          tabBarLabel: ({ focused }) => (
            <TabLabel label={brand.tabs.splits} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: brand.tabs.you,
          tabBarLabel: ({ focused }) => (
            <TabLabel label={brand.tabs.you} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
