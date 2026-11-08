import { CompeteExperienceProvider } from "../../src/features/compete-experience";
import type { CompeteEvent } from "@fitness-battle/shared";
import { ArenaScreen } from "./arena";
import { useEffect, useState } from "react";
import { usePathname } from "expo-router";
import { useAppTheme } from "../../src/appearance";
import { useThemeColors } from "../../src/theme";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform, View } from "react-native";
import { AppHeader } from "../../src/ui/app-header";
import { useOnboardingRequired } from "../../src/lib/onboarding-navigation";
import { Redirect } from "expo-router";
import { Tabs } from "expo-router";
import { PhoneTabBar } from "../../src/ui/phone-tab-bar";


export default function TabLayout() {
  const { mode } = useAppTheme();
  const SHELL_COLORS = useThemeColors();
  const pathname = usePathname();
  const compete = pathname.endsWith("/arena");
  const [event, setEvent] = useState<{ account: string; sport: CompeteEvent } | null>(null);
  const [immersive, setImmersive] = useState(false);
  useEffect(() => { if (!compete) setImmersive(false); }, [compete]);
  const experience = { event, immersive: immersive && compete, enter: (account: string, sport: CompeteEvent) => { setEvent({ account, sport }); setImmersive(true); }, close: () => setImmersive(false) };
  const host = <View pointerEvents={experience.immersive ? "auto" : "none"} accessibilityElementsHidden={!experience.immersive} importantForAccessibility={experience.immersive ? "auto" : "no-hide-descendants"} style={{ position: "absolute", inset: 0, opacity: experience.immersive ? 1 : 0, zIndex: experience.immersive ? 100 : -1 }}><ArenaScreen persistent /></View>;
  const { pending, required } = useOnboardingRequired();
  if (pending) return <View style={{ flex: 1, backgroundColor: SHELL_COLORS.paper }} />;
  if (required) return <Redirect href="/onboarding" />;
  if (Platform.OS === "ios") return <CompeteExperienceProvider value={experience}><View style={{ flex: 1 }}><View style={{ flex: 1 }} accessibilityElementsHidden={experience.immersive} importantForAccessibility={experience.immersive ? "no-hide-descendants" : "auto"}><AppHeader />
    <NativeTabs tintColor={SHELL_COLORS.ink} blurEffect={mode === "dark" ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight"} backgroundColor={SHELL_COLORS.surfaceNavigation} disableTransparentOnScrollEdge>
      <NativeTabs.Trigger name="today" accessibilityLabel="Home"><NativeTabs.Trigger.Icon src={require("../../assets/icons/phosphor/home.png")} renderingMode="template" /><NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="arena" accessibilityLabel="Compete"><NativeTabs.Trigger.Icon src={require("../../assets/icons/phosphor/compete.png")} renderingMode="template" /><NativeTabs.Trigger.Label>Compete</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="you" accessibilityLabel="Progress"><NativeTabs.Trigger.Icon src={require("../../assets/icons/phosphor/progress.png")} renderingMode="template" /><NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="field" accessibilityLabel="Crew"><NativeTabs.Trigger.Icon src={require("../../assets/icons/phosphor/crew.png")} renderingMode="template" /><NativeTabs.Trigger.Label>Crew</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    </NativeTabs></View>{host}
  </View></CompeteExperienceProvider>;
  return (
    <CompeteExperienceProvider value={experience}><View style={{ flex: 1 }}><View style={{ flex: 1 }} accessibilityElementsHidden={experience.immersive} importantForAccessibility={experience.immersive ? "no-hide-descendants" : "auto"}><AppHeader /><Tabs
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
    </Tabs></View>{host}</View></CompeteExperienceProvider>
  );
}
