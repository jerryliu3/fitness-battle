import { useRef } from "react";
import { AppText, textStyle } from "./section";
import { Platform, View } from "react-native";
import { Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "./icon-button";
import { SHELL_COLORS as c } from "../theme";
import { f } from "./focus";

interface ScreenHeaderProps { title: string; onBack: () => void; localBack?: boolean; hidden?: boolean }
function IOSScreenHeader({ title, onBack, localBack = false, hidden = false }: ScreenHeaderProps) {
  const height = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const reservedHeight = useRef(Math.max(44, height - insets.top));
  if (!hidden && height > insets.top) reservedHeight.current = Math.max(44, height - insets.top);
  return <>
    <Stack.Screen options={{ headerShown: !hidden, title, headerTransparent: true, headerBackVisible: false,
      headerTintColor: c.ink, headerTitleStyle: textStyle("heading"), gestureEnabled: !localBack && !hidden,
      ...(Number.parseFloat(String(Platform.Version)) < 26 ? { headerBlurEffect: "systemThinMaterial" as const } : {}) }} />
    {!hidden && <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button icon="chevron.backward" accessibilityLabel="Return to previous screen" onPress={onBack}>Back</Stack.Toolbar.Button>
    </Stack.Toolbar>}
    {/* Callers already apply the top safe inset; reserve only the native bar. */}
    <View style={{ height: reservedHeight.current }} />
  </>;
}
/** iOS uses system toolbar items (Liquid Glass on iOS 26+), preserving local Back callbacks. */
export function ScreenHeader(props: ScreenHeaderProps) {
  if (Platform.OS === "ios") return <IOSScreenHeader {...props} />;
  return <View style={[f.row, { paddingHorizontal: 22, paddingVertical: 8 }]}>
    <IconButton icon="back" label="Return to previous screen" onPress={props.onBack} />
    <AppText role="heading" accessibilityRole="header" style={{ flex: 1, textAlign: "center" }}>{props.title}</AppText><View style={{ width: 44 }} />
  </View>;
}
