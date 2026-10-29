import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform, View } from "react-native";
import { AppHeader } from "../../src/ui/app-header";
import { Tabs } from "expo-router";
import { PhoneTabBar } from "../../src/ui/phone-tab-bar";
import { SHELL_COLORS } from "../../src/theme";

export default function TabLayout() {
  if (Platform.OS === "ios") return <View style={{ flex: 1 }}><AppHeader />
    <NativeTabs tintColor={SHELL_COLORS.ink} blurEffect="systemUltraThinMaterialLight" backgroundColor="#ffffff" disableTransparentOnScrollEdge>
      <NativeTabs.Trigger name="today" accessibilityLabel="Home"><NativeTabs.Trigger.Icon sf="house" /><NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="arena" accessibilityLabel="Compete"><NativeTabs.Trigger.Icon sf="flag.checkered" /><NativeTabs.Trigger.Label>Compete</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="you" accessibilityLabel="Progress"><NativeTabs.Trigger.Icon sf="chart.xyaxis.line" /><NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="field" accessibilityLabel="Crew"><NativeTabs.Trigger.Icon sf="person.2" /><NativeTabs.Trigger.Label>Crew</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    </NativeTabs>
  </View>;
  return (
    <View style={{ flex: 1 }}><AppHeader /><Tabs
      tabBar={(props) => <PhoneTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: false,
        freezeOnBlur: true,
        tabBarShowLabel: true,
        sceneStyle: { backgroundColor: SHELL_COLORS.paper },
      }}
    >
      <Tabs.Screen name="today" options={{ title: "Home" }} />
      <Tabs.Screen name="arena" options={{ title: "Compete" }} />
      <Tabs.Screen name="you" options={{ title: "Progress" }} />
      <Tabs.Screen name="field" options={{ title: "Crew" }} />
    </Tabs></View>
  );
}
