import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors, fonts } from "../../src/theme";

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontFamily: focused ? fonts.bodyBold : fonts.bodyMedium,
        fontSize: 11,
        color: focused ? colors.ink : colors.muted,
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
          backgroundColor: colors.card,
          borderTopColor: colors.line,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "My track",
          tabBarLabel: ({ focused }) => <TabLabel label="Track" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="board"
        options={{
          title: "The field",
          tabBarLabel: ({ focused }) => <TabLabel label="Field" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="splits"
        options={{
          title: "Splits",
          tabBarLabel: ({ focused }) => <TabLabel label="Splits" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: "Athlete",
          tabBarLabel: ({ focused }) => <TabLabel label="You" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
