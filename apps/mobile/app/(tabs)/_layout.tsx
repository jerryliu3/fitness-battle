import { SHELL_TABS } from "@fitness-battle/shared";
import { ArenaScreen } from "./arena";
import { useRef } from "react";
import { useRouter, usePathname } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform, View } from "react-native";
import { AppHeader } from "../../src/ui/app-header";
import { useOnboardingRequired } from "../../src/lib/onboarding-navigation";
import { Redirect } from "expo-router";
import { Tabs } from "expo-router";
import { PhoneTabBar } from "../../src/ui/phone-tab-bar";
import { SHELL_COLORS } from "../../src/theme";

export default function TabLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const compete = pathname.endsWith("/arena");
  const origin = useRef("/today");
  if (!compete) origin.current = pathname;
  const host = <View pointerEvents={compete ? "auto" : "none"} accessibilityElementsHidden={!compete} importantForAccessibility={compete ? "auto" : "no-hide-descendants"} style={{ position: "absolute", inset: 0, opacity: compete ? 1 : 0, zIndex: compete ? 100 : -1 }}><ArenaScreen persistent onExit={() => router.navigate(origin.current as "/today")} /></View>;
  const competeTabs = compete ? <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 110, zIndex: 110 }}><PhoneTabBar state={{ index: 1, routes: SHELL_TABS.map(tab => ({ key: tab.id, name: tab.id })) }} navigateToTab={id => router.navigate((SHELL_TABS.find(tab => tab.id === id)?.href ?? "/today") as "/today")} /></View> : null;
  const { pending, required } = useOnboardingRequired();
  if (pending) return <View style={{ flex: 1, backgroundColor: SHELL_COLORS.paper }} />;
  if (required) return <Redirect href="/onboarding" />;
  if (Platform.OS === "ios") return <View style={{ flex: 1 }}><View style={compete ? { display: "none" } : undefined}><AppHeader /></View>
    <NativeTabs tintColor={SHELL_COLORS.ink} blurEffect="systemUltraThinMaterialLight" backgroundColor="#ffffff" disableTransparentOnScrollEdge>
      <NativeTabs.Trigger name="today" accessibilityLabel="Home"><NativeTabs.Trigger.Icon sf="house" /><NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="arena" accessibilityLabel="Compete"><NativeTabs.Trigger.Icon sf="flag.checkered" /><NativeTabs.Trigger.Label>Compete</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="you" accessibilityLabel="Progress"><NativeTabs.Trigger.Icon sf="chart.xyaxis.line" /><NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="field" accessibilityLabel="Crew"><NativeTabs.Trigger.Icon sf="person.2" /><NativeTabs.Trigger.Label>Crew</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    </NativeTabs>{host}{competeTabs}
  </View>;
  return (
    <View style={{ flex: 1 }}><View style={compete ? { display: "none" } : undefined}><AppHeader /></View><Tabs
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
    </Tabs>{host}{competeTabs}</View>
  );
}
