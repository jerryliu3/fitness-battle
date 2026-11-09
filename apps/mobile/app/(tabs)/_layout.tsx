import { useReducedMotion } from "../../src/ui/use-reduced-motion";
import { CompeteExperienceProvider } from "../../src/features/compete-experience";
import type { CompeteEvent } from "@fitness-battle/shared";
import { ArenaScreen } from "./arena";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "expo-router";
import { useAppTheme } from "../../src/appearance";
import { useThemeColors } from "../../src/theme";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Animated, Easing, Platform, View, useWindowDimensions } from "react-native";
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
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const slide = useRef(new Animated.Value(width)).current;
  useEffect(() => { Animated.timing(slide, { toValue: immersive && compete ? 0 : width, duration: reduced ? 0 : 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); return () => slide.stopAnimation(); }, [immersive, compete, width, reduced, slide]);
  const closeEvent = () => Animated.timing(slide, { toValue: width, duration: reduced ? 0 : 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => { if (finished) setImmersive(false); });
  const experience = { event, immersive: immersive && compete, enter: (account: string, sport: CompeteEvent) => { setEvent({ account, sport }); setImmersive(true); }, close: closeEvent };
  const host = <Animated.View pointerEvents={experience.immersive ? "auto" : "none"} accessibilityElementsHidden={!experience.immersive} importantForAccessibility={experience.immersive ? "auto" : "no-hide-descendants"} style={{ position: "absolute", inset: 0, transform: [{ translateX: slide }], zIndex: 100 }}><ArenaScreen persistent /></Animated.View>;
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
