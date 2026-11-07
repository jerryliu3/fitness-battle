import { CompeteExperienceProvider, type PreviewFrame } from "../../src/features/compete-experience";
import type { SportId } from "@fitness-battle/shared";
import { ArenaScreen } from "./arena";
import { useCallback, useRef, useEffect, useState } from "react";
import { usePathname } from "expo-router";
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
  const compete = pathname.endsWith("/arena");
  const [event, setEvent] = useState<{ account: string; sport: SportId } | null>(null);
  const [immersive, setImmersive] = useState(false);
  useEffect(() => { if (!compete) setImmersive(false); }, [compete]);
  const [viewport, setViewport] = useState<PreviewFrame>();
  const [previews, setPreviews] = useState<Partial<Record<SportId, PreviewFrame>>>({});
  const measures = useRef(new Map<SportId, () => void>());
  const registerPreview = useCallback((sport: SportId, measure: (() => void) | null) => { if (measure) measures.current.set(sport, measure); else measures.current.delete(sport); }, []);
  const updatePreview = useCallback((sport: SportId, frame: PreviewFrame) => setPreviews(previous => JSON.stringify(previous[sport]) === JSON.stringify(frame) ? previous : { ...previous, [sport]: frame }), []);
  const measurePreviews = useCallback(() => measures.current.forEach(measure => measure()), []);
  const experience = { viewport, updateViewport: setViewport, previews, registerPreview, updatePreview, measurePreviews, event, immersive: immersive && compete, enter: (account: string, sport: SportId) => { setEvent({ account, sport }); setImmersive(true); }, close: () => setImmersive(false) };
  const host = <View pointerEvents={compete ? "box-none" : "none"} accessibilityElementsHidden={!experience.immersive} importantForAccessibility={experience.immersive ? "auto" : "no-hide-descendants"} style={{ position: "absolute", inset: 0, opacity: compete ? 1 : 0, zIndex: compete ? 100 : -1 }}><ArenaScreen persistent /></View>;
  const { pending, required } = useOnboardingRequired();
  if (pending) return <View style={{ flex: 1, backgroundColor: SHELL_COLORS.paper }} />;
  if (required) return <Redirect href="/onboarding" />;
  if (Platform.OS === "ios") return <CompeteExperienceProvider value={experience}><View style={{ flex: 1 }}><View style={{ flex: 1 }} accessibilityElementsHidden={experience.immersive} importantForAccessibility={experience.immersive ? "no-hide-descendants" : "auto"}><AppHeader />
    <NativeTabs tintColor={SHELL_COLORS.ink} blurEffect="systemUltraThinMaterialLight" backgroundColor="#ffffff" disableTransparentOnScrollEdge>
      <NativeTabs.Trigger name="today" accessibilityLabel="Home"><NativeTabs.Trigger.Icon sf="house" /><NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="arena" accessibilityLabel="Compete"><NativeTabs.Trigger.Icon sf="flag.checkered" /><NativeTabs.Trigger.Label>Compete</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="you" accessibilityLabel="Progress"><NativeTabs.Trigger.Icon sf="chart.xyaxis.line" /><NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="field" accessibilityLabel="Crew"><NativeTabs.Trigger.Icon sf="person.2" /><NativeTabs.Trigger.Label>Crew</NativeTabs.Trigger.Label></NativeTabs.Trigger>
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
