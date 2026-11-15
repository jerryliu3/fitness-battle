import { requireNativeView, requireOptionalNativeModule } from "expo";
import { Pressable, Text, type ViewProps } from "react-native";
import { useThemeColors } from "../theme";
import { IconButton } from "./icon-button";
import { textStyle } from "./section";
const NativeBack = requireOptionalNativeModule("AnchoredChoice")
  ? requireNativeView<ViewProps & { backButton: boolean; onSelect(): void }>("AnchoredChoice") : null;
export function MaterialBack({ onPress, label = "Back to events" }: { onPress(): void; label?: string }) {
  return NativeBack ? <NativeBack accessibilityLabel={label} backButton onSelect={onPress} style={{ width: 44, height: 44 }} />
    : <IconButton icon="back" label={label} onPress={onPress} />;
}

export function MaterialClose({ onPress, disabled = false, label = "Close" }: { onPress(): void; disabled?: boolean; label?: string }) {
  const c = useThemeColors();
  const isLight = c.paper === "#f8f9f6";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: isLight ? "rgba(255, 255, 255, 0.72)" : "rgba(255, 255, 255, 0.18)",
        backgroundColor: isLight ? "rgba(255, 255, 255, 0.68)" : "rgba(28, 46, 56, 0.72)",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: c.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        opacity: disabled ? 0.4 : pressed ? 0.65 : 1,
      })}
    >
      <Text style={{ ...textStyle("heading"), color: c.ink }}>✕</Text>
    </Pressable>
  );
}
