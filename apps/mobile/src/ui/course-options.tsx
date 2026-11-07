import { AppIcon } from "./app-icon";
import { useRef } from "react";
import { Platform, Pressable, Switch, Text, View } from "react-native";
import { AnchoredMenu, useAnchoredMenu } from "./anchored-menu";
import { textStyle } from "./section";
import { playCue } from "../lib/haptics";
import { SHELL_COLORS as c } from "../theme";

export function CourseOptions({ flat, spaced, onToggleDimension, onToggleSpacing, onOverview, onReplay, onChoose2D }: {
  onReplay?: () => void;
  onChoose2D?: () => void;
  flat: boolean;
  spaced: boolean;
  onToggleDimension(): void;
  onToggleSpacing(): void;
  onOverview(): void;
}) {
  const { open, close, toggle, anchorRef, menuLayout } = useAnchoredMenu({
    minWidth: 220,
    estimatedHeight: 164 + (onReplay ? 44 : 0) + (onChoose2D ? 44 : 0),
  });
  const pendingReplay = useRef<(() => void) | null>(null);
  const finishReplay = () => {
    const replay = pendingReplay.current;
    pendingReplay.current = null;
    replay?.();
  };
  const options = [
    ...(onChoose2D ? [{ label: "Select 2D", action: onChoose2D }] : []),
    ...(onReplay ? [{ label: "View replay", action: () => {
      if (Platform.OS === "ios") pendingReplay.current = onReplay;
      else onReplay();
    } }] : []),
    { label: "Perspective view", value: !flat, action: onToggleDimension },
    { label: "Shared lane", value: !spaced, action: onToggleSpacing },
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
        minHeight: 28,
        minWidth: 28,
        alignItems: "center",
        paddingHorizontal: 0,
        justifyContent: "center",
        borderRadius: 999,
        backgroundColor: "transparent",
        borderWidth: 0,
        borderColor: "rgba(255, 255, 255, 0.2)",
      }, pressed && { opacity: 0.75 }]}
    >
      <AppIcon name="settings" size={22} color={c.ink} />
    </Pressable>
    <AnchoredMenu open={open} onClose={close} onDismiss={onReplay ? finishReplay : undefined} menuLayout={menuLayout} accessibilityLabel="Close course options">
      {options.map(option => "value" in option ? <View key={option.label} style={{ minHeight: 52, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <Text style={{ ...textStyle("caption"), color: c.ink, flex: 1 }}>{option.label}</Text>
        <Switch style={{ margin: 0 }} accessibilityLabel={option.label} value={option.value} onValueChange={() => { void playCue("selection"); option.action(); }} trackColor={{ false: c.line, true: c.tennis }} />
      </View> : <Pressable
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
