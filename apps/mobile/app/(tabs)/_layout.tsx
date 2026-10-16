import { Tabs } from "expo-router";
import { PhoneTabBar } from "../../src/ui/phone-tab-bar";
import { SHELL_COLORS } from "../../src/theme";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <PhoneTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: false,
        freezeOnBlur: true,
        sceneStyle: { backgroundColor: SHELL_COLORS.paper },
      }}
    >
      <Tabs.Screen name="today" options={{ title: "Home" }} />
      <Tabs.Screen name="arena" options={{ title: "Arena" }} />
      <Tabs.Screen name="field" options={{ title: "Crew" }} />
      <Tabs.Screen name="you" options={{ title: "Athlete" }} />
    </Tabs>
  );
}
