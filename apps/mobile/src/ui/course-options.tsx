import { SettingsToggleRow } from "./settings-toggle-row";
import { AppIcon } from "./app-icon";
import { useThemeColors } from "../theme";
import { useRef } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { AnchoredMenu, useAnchoredMenu } from "./anchored-menu";
import { textStyle } from "./section";
import { playCue } from "../lib/haptics";


export function CourseOptions({ flat, spaced, onToggleDimension, onToggleSpacing, onOverview, onReplay, onChoose2D }: {
  onReplay?: () => void;
  onChoose2D?: () => void;
  flat: boolean;
  spaced: boolean;
  onToggleDimension(): void;
  onToggleSpacing(): void;
  onOverview(): void;
}) {
const appearanceColors = useThemeColors();

const c=useThemeColors();

  const { open, close, toggle, anchorRef, menuLayout } = useAnchoredMenu({
    minWidth: 220,
    estimatedHeight: 164 + (onReplay ? 44 : 0) + (onChoose2D ? 44 : 0),
  });
  const pendingAction = useRef<(() => void) | null>(null);
  const finishPendingAction = () => {
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  };
  const switchRenderer = () => {
    if (!onChoose2D) return;
    if (Platform.OS === "ios") pendingAction.current = onChoose2D;
    else onChoose2D();
    close();
  };
  const options = [
    ...(onChoose2D ? [{ label: "3D view", value: true, action: switchRenderer }] : []),
    { label: "Perspective view", value: !flat, action: onToggleDimension },
    { label: "Shared lane", value: !spaced, action: onToggleSpacing },
    ...(onReplay ? [{ label: "View replay", action: () => {
      if (Platform.OS === "ios") pendingAction.current = onReplay;
      else onReplay();
    } }] : []),
    { label: "See overview", action: onOverview },
  ];

  return <View ref={anchorRef} collapsable={false}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Course options"
      accessibilityState={{ expanded: open }}
      hitSlop={8}
      onPress={toggle}
      style={({ pressed }) => [{
        minHeight: 44,
        minWidth: 44,
        alignItems: "center",
        paddingHorizontal: 0,
        justifyContent: "center",
        borderRadius: 999,
        backgroundColor: "rgba(20, 20, 19, 0.72)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
      }, pressed && { opacity: 0.75 }]}
    >
      <AppIcon name="layers" size={22} color="#ffffff" />
    </Pressable>
    <AnchoredMenu open={open} onClose={close} onDismiss={finishPendingAction} style={{ width: menuLayout?.width ?? 220 }} menuLayout={menuLayout} accessibilityLabel="Close course options">
      {options.map(option => "value" in option ? <SettingsToggleRow key={option.label} label={option.label} value={Boolean(option.value)} onChange={() => { void playCue("selection"); option.action(); }} /> : <Pressable
        key={option.label}
        accessibilityRole="button"
        accessibilityLabel={option.label}
        onPress={() => { void playCue("selection"); close(); option.action(); }}
        style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center" }, pressed && { opacity: 0.7 }]}
      >
        <Text style={{ ...textStyle("caption"), color: c.ink }}>{option.label}</Text>
      </Pressable>)}
    </AnchoredMenu>
  </View>;
}
