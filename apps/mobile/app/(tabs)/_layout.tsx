import { Tabs } from "expo-router";
import { PhoneTabBar } from "../../src/ui/phone-tab-bar";
import { SHELL_COLORS } from "../../src/theme";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <PhoneTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: SHELL_COLORS.paper },
      }}
    >
      <Tabs.Screen name="today" options={{ title: "Today" }} />
      <Tabs.Screen name="arena" options={{ title: "Arena" }} />
      <Tabs.Screen name="field" options={{ title: "Field" }} />
      <Tabs.Screen name="you" options={{ title: "You" }} />
    </Tabs>
  );
}
